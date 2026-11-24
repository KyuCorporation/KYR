package br.tourapp.kyr.service;

import br.tourapp.kyr.dto.MetadadosDTO;
import br.tourapp.kyr.dto.POIDTO;
import br.tourapp.kyr.dto.PontoDTO;
import br.tourapp.kyr.dto.RoteiroRequestDTO;
import br.tourapp.kyr.dto.RoteiroResponseDTO;
import br.tourapp.kyr.dto.TrechoRotaDTO;
import br.tourapp.kyr.dto.Transporte;
import br.tourapp.kyr.iaservice.client.IaServiceClient;
import br.tourapp.kyr.iaservice.client.dto.CuradoriaResponseDto;
import br.tourapp.kyr.iaservice.client.dto.PontoBrutoDto;
import br.tourapp.kyr.iaservice.client.dto.PontoCuradoDto;
import br.tourapp.kyr.poi.exception.GoogleMapsIntegrationException;
import br.tourapp.kyr.poi.model.Coordenada;
import br.tourapp.kyr.poi.model.PoiCandidato;
import br.tourapp.kyr.poi.model.PoisNaRota;
import br.tourapp.kyr.poi.service.RotaPoiService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.IdentityHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

// Orquestra o POST /roteiros: POIs do Places na rota informada → curadoria no ia-service → ordenação na Directions.
// Falha do Places propaga (vira 502); falha da curadoria ou da ordenação degrada a resposta, sem erro para o cliente.
@Service
public class RoteiroService {

    public static final String FONTE_IA_SEM_CURADORIA = "sem-curadoria";
    public static final String FONTE_ROTA_GOOGLE = "google-directions-api";
    public static final String FONTE_ROTA_FALLBACK = "fallback-sem-otimizacao";

    // Um POI precisa de bem mais que PESO_AVALIACOES avaliações para a nota dele pesar mais que a de referência.
    private static final double PESO_AVALIACOES = 50;
    private static final double NOTA_DE_REFERENCIA = 4.0;

    private static final Logger log = LoggerFactory.getLogger(RoteiroService.class);

    private final RotaPoiService rotaPoiService;
    private final IaServiceClient iaServiceClient;
    private final DirectionsService directionsService;
    private final int maxPoisCuradoria;
    private final CuradoriaCache curadoriaCache;

    // Sem cache de curadoria: usado nos testes.
    public RoteiroService(RotaPoiService rotaPoiService, IaServiceClient iaServiceClient,
                          DirectionsService directionsService, int maxPoisCuradoria) {
        this(rotaPoiService, iaServiceClient, directionsService, maxPoisCuradoria, CuradoriaCache.SEM_CACHE);
    }

    @Autowired
    public RoteiroService(RotaPoiService rotaPoiService, IaServiceClient iaServiceClient,
                          DirectionsService directionsService,
                          @Value("${roteiro.max-pois-curadoria:10}") int maxPoisCuradoria,
                          CuradoriaCache curadoriaCache) {
        this.curadoriaCache = curadoriaCache;
        this.rotaPoiService = rotaPoiService;
        this.iaServiceClient = iaServiceClient;
        this.directionsService = directionsService;
        this.maxPoisCuradoria = maxPoisCuradoria;
    }

    public RoteiroResponseDTO gerarRoteiro(RoteiroRequestDTO request) {
        long inicio = System.currentTimeMillis();

        List<PontoDTO> paradas = request.paradasOuVazio();
        Transporte transporte = request.transporteOuPadrao();

        PoisNaRota poisNaRota = buscarPois(request, paradas, transporte);

        List<PoiCandidato> selecionados = selecionarMaisBemAvaliados(poisNaRota.candidatos());
        if (selecionados.isEmpty() && paradas.isEmpty()) {
            return montarResposta(List.of(), inicio, FONTE_IA_SEM_CURADORIA, false, new Ordenacao(List.of(), FONTE_ROTA_FALLBACK), transporte);
        }

        Curadoria curadoria = selecionados.isEmpty()
                ? new Curadoria(List.of(), false, FONTE_IA_SEM_CURADORIA)
                : curar(selecionados);

        // As paradas entram no roteiro junto com os lugares sugeridos, mas não passam pela IA.
        List<POIDTO> pontos = new ArrayList<>(paradas.stream().map(POIDTO::daParada).toList());
        pontos.addAll(curadoria.pontos());
        Ordenacao ordenacao = ordenar(request, pontos, transporte);

        return montarResposta(ordenacao.pontos(), inicio, curadoria.fonteIA(), curadoria.curadoPorIa(), ordenacao,
                transporte);
    }

    // Sem paradas e de carro, usa a mesma chamada de antes. No transporte público a Directions não aceita
    // paradas, então a rota usada para achar os lugares é a de carro.
    private PoisNaRota buscarPois(RoteiroRequestDTO request, List<PontoDTO> paradas, Transporte transporte) {
        Coordenada origem = paraCoordenada(request.origem());
        Coordenada destino = paraCoordenada(request.destino());
        if (paradas.isEmpty() && transporte == Transporte.DRIVING) {
            return rotaPoiService.buscarPoisNaRota(origem, destino, null);
        }
        List<Coordenada> coordenadasDasParadas = paradas.stream().map(this::paraCoordenada).toList();
        String carro = Transporte.DRIVING.modoDirections();
        String modo = transporte.aceitaParadas() ? transporte.modoDirections() : carro;
        if (modo.equals(carro)) {
            return rotaPoiService.buscarPoisNaRota(origem, destino, coordenadasDasParadas, carro, null);
        }
        try {
            return rotaPoiService.buscarPoisNaRota(origem, destino, coordenadasDasParadas, modo, null);
        } catch (GoogleMapsIntegrationException e) {
            // A Directions não tem rota a pé ou de bicicleta em toda região (ZERO_RESULTS). Em vez de falhar
            // o roteiro inteiro, busca os lugares pela rota de carro; a ordenação ainda tenta o modo escolhido.
            log.warn("Sem rota no modo {} para buscar lugares, usando a de carro: {}", modo, e.getMessage());
            return rotaPoiService.buscarPoisNaRota(origem, destino, coordenadasDasParadas, carro, null);
        }
    }

    private List<PoiCandidato> selecionarMaisBemAvaliados(List<PoiCandidato> candidatos) {
        return candidatos.stream()
                .sorted(Comparator.comparing(RoteiroService::relevancia, Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(Math.max(maxPoisCuradoria, 0))
                .toList();
    }

    // Nota ponderada pelo total de avaliações (média bayesiana): um lugar com nota 5,0 e 3 avaliações
    // não passa na frente de um com 4,7 e milhares. Sem o total de avaliações, vale a nota pura.
    static Double relevancia(PoiCandidato poi) {
        if (poi.nota() == null) {
            return null;
        }
        if (poi.totalAvaliacoes() == null) {
            return poi.nota();
        }
        double avaliacoes = Math.max(poi.totalAvaliacoes(), 0);
        return (avaliacoes * poi.nota() + PESO_AVALIACOES * NOTA_DE_REFERENCIA) / (avaliacoes + PESO_AVALIACOES);
    }

    private Curadoria curar(List<PoiCandidato> selecionados) {
        // Lugares que a IA já curou em outro roteiro vêm do cache; só o restante vai para o ia-service.
        Map<String, CuradoriaCache.Curada> emCache = buscarNoCache(selecionados);
        List<PoiCandidato> pendentes = selecionados.stream()
                .filter(poi -> poi.placeId() == null || !emCache.containsKey(poi.placeId()))
                .toList();

        Map<PoiCandidato, PontoCuradoDto> novos = new IdentityHashMap<>();
        String modeloDaChamada = null;
        boolean iaCurou = false;

        if (!pendentes.isEmpty()) {
            CuradoriaResponseDto resposta = chamarIaService(pendentes);
            if (resposta != null && resposta.curadoPorIa()) {
                iaCurou = true;
                String modelo = resposta.modeloUtilizado();
                modeloDaChamada = modelo != null && !modelo.isBlank() ? modelo : "ia-service";
                novos.putAll(casarCurados(pendentes, resposta.pontos()));
                guardarNoCache(novos, modeloDaChamada);
            }
        }

        List<POIDTO> pontos = new ArrayList<>(selecionados.size());
        String modeloDoCache = null;
        for (PoiCandidato poi : selecionados) {
            CuradoriaCache.Curada guardada = poi.placeId() != null ? emCache.get(poi.placeId()) : null;
            if (guardada != null) {
                if (modeloDoCache == null) {
                    modeloDoCache = guardada.modelo();
                }
                pontos.add(paraPonto(poi, guardada.trilha(), guardada.tipo(), guardada.descricao(), true));
            } else {
                PontoCuradoDto curado = novos.get(poi);
                boolean foiCurado = curado != null && curado.curado();
                pontos.add(paraPonto(poi, foiCurado ? curado.trilha() : null, foiCurado ? curado.tipo() : null,
                        foiCurado ? curado.descricao() : null, foiCurado));
            }
        }

        if (iaCurou) {
            return new Curadoria(pontos, true, modeloDaChamada);
        }
        if (modeloDoCache != null) {
            return new Curadoria(pontos, true, modeloDoCache);
        }
        return new Curadoria(pontos, false, FONTE_IA_SEM_CURADORIA);
    }

    private CuradoriaResponseDto chamarIaService(List<PoiCandidato> pendentes) {
        List<PontoBrutoDto> pontosBrutos = pendentes.stream()
                .map(poi -> new PontoBrutoDto(poi.nome(), poi.categoria(),
                        List.of(poi.coordenadas().latitude(), poi.coordenadas().longitude())))
                .toList();
        try {
            return iaServiceClient.curar(pontosBrutos);
        } catch (RuntimeException e) {
            log.warn("Falha na curadoria pelo ia-service, devolvendo roteiro sem curadoria: {}", e.getMessage());
            return null;
        }
    }

    private Map<PoiCandidato, PontoCuradoDto> casarCurados(List<PoiCandidato> enviados, List<PontoCuradoDto> curados) {
        boolean mesmaOrdem = curados.size() == enviados.size();
        Map<String, PontoCuradoDto> curadosPorNome = new HashMap<>();
        for (PontoCuradoDto curado : curados) {
            if (curado != null && curado.nome() != null) {
                curadosPorNome.putIfAbsent(curado.nome(), curado);
            }
        }

        Map<PoiCandidato, PontoCuradoDto> casados = new IdentityHashMap<>();
        for (int i = 0; i < enviados.size(); i++) {
            PoiCandidato poi = enviados.get(i);
            // O ia-service devolve os pontos na mesma ordem do envio; o nome é só a alternativa
            // para uma resposta de tamanho diferente.
            PontoCuradoDto curado = mesmaOrdem ? curados.get(i) : curadosPorNome.get(poi.nome());
            if (curado != null) {
                casados.put(poi, curado);
            }
        }
        return casados;
    }

    // Falha no cache nunca derruba o roteiro: sem leitura, tudo vai para a IA; sem gravação, só não reaproveita.
    private Map<String, CuradoriaCache.Curada> buscarNoCache(List<PoiCandidato> selecionados) {
        try {
            return curadoriaCache.buscar(selecionados.stream().map(PoiCandidato::placeId).filter(Objects::nonNull).toList());
        } catch (RuntimeException e) {
            log.warn("Não foi possível ler o cache de curadoria: {}", e.getMessage());
            return Map.of();
        }
    }

    private void guardarNoCache(Map<PoiCandidato, PontoCuradoDto> novos, String modelo) {
        Map<String, CuradoriaCache.Curada> paraGuardar = new HashMap<>();
        novos.forEach((poi, curado) -> {
            if (poi.placeId() != null && curado.curado() && curado.trilha() != null && curado.tipo() != null
                    && curado.descricao() != null) {
                paraGuardar.put(poi.placeId(), new CuradoriaCache.Curada(curado.trilha(), curado.tipo(), curado.descricao(), modelo));
            }
        });
        if (paraGuardar.isEmpty()) {
            return;
        }
        try {
            curadoriaCache.salvar(paraGuardar);
        } catch (RuntimeException e) {
            log.warn("Não foi possível gravar o cache de curadoria: {}", e.getMessage());
        }
    }

    private POIDTO paraPonto(PoiCandidato poi, String trilha, String tipo, String descricao, boolean curado) {
        return new POIDTO(
                poi.nome(),
                trilha,
                tipo,
                poi.endereco(),
                poi.coordenadas().latitude(),
                poi.coordenadas().longitude(),
                poi.linkMaps(),
                descricao,
                curado,
                null,
                null,
                poi.placeId());
    }

    private Ordenacao ordenar(RoteiroRequestDTO request, List<POIDTO> pontos, Transporte transporte) {
        if (!transporte.aceitaParadas()) {
            // Transporte público: a Directions não otimiza pontos intermediários nesse modo.
            return new Ordenacao(pontos, FONTE_ROTA_FALLBACK);
        }
        try {
            List<PontoDTO> waypoints = pontos.stream()
                    .map(p -> new PontoDTO(p.nome(), p.latitude(), p.longitude()))
                    .toList();

            DirectionsService.ResultadoRota rota = transporte == Transporte.DRIVING
                    ? directionsService.calcularRotaOtimizada(request.origem(), request.destino(), waypoints)
                    : directionsService.calcularRotaOtimizada(request.origem(), request.destino(), waypoints,
                            transporte.modoDirections());

            List<TrechoRotaDTO> trechos = rota.trechos();
            return new Ordenacao(aplicarOrdem(pontos, rota.ordemOtimizada(), trechos), FONTE_ROTA_GOOGLE,
                    trechos.stream().mapToLong(TrechoRotaDTO::distanciaMetros).sum(),
                    trechos.stream().mapToLong(TrechoRotaDTO::tempoSegundos).sum());
        } catch (RuntimeException e) {
            // Directions indisponível ou resposta inesperada: mantém a ordem da seleção, sem distância nem duração.
            log.warn("Falha ao ordenar o roteiro na Directions API, usando a ordem original: {}", e.getMessage());
            return new Ordenacao(pontos, FONTE_ROTA_FALLBACK);
        }
    }

    private List<POIDTO> aplicarOrdem(List<POIDTO> pontos, List<Integer> ordemOtimizada, List<TrechoRotaDTO> trechos) {
        if (ordemOtimizada == null || trechos == null
                || ordemOtimizada.size() != pontos.size()
                || new HashSet<>(ordemOtimizada).size() != pontos.size()
                || trechos.size() < pontos.size()) {
            throw new IllegalStateException("Directions API devolveu uma ordem de waypoints incompatível com os POIs enviados");
        }

        List<POIDTO> ordenados = new ArrayList<>(pontos.size());
        for (int i = 0; i < ordemOtimizada.size(); i++) {
            TrechoRotaDTO trecho = trechos.get(i);
            ordenados.add(pontos.get(ordemOtimizada.get(i)).comTrecho(trecho.distanciaMetros(), trecho.tempoSegundos()));
        }
        return ordenados;
    }

    private RoteiroResponseDTO montarResposta(List<POIDTO> pontos, long inicio, String fonteIA, boolean curadoPorIa,
                                              Ordenacao ordenacao, Transporte transporte) {
        long tempoResposta = System.currentTimeMillis() - inicio;
        return new RoteiroResponseDTO(pontos, new MetadadosDTO(pontos.size(), tempoResposta, fonteIA, curadoPorIa,
                ordenacao.fonteRota(), transporte.name(), ordenacao.distanciaTotalMetros(), ordenacao.duracaoTotalSegundos()));
    }

    private Coordenada paraCoordenada(PontoDTO ponto) {
        return new Coordenada(ponto.latitude(), ponto.longitude());
    }

    private record Curadoria(List<POIDTO> pontos, boolean curadoPorIa, String fonteIA) {
    }

    private record Ordenacao(List<POIDTO> pontos, String fonteRota, Long distanciaTotalMetros, Long duracaoTotalSegundos) {
        Ordenacao(List<POIDTO> pontos, String fonteRota) {
            this(pontos, fonteRota, null, null);
        }
    }
}

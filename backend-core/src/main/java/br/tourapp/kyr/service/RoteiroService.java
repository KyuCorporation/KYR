package br.tourapp.kyr.service;

import br.tourapp.kyr.dto.MetadadosDTO;
import br.tourapp.kyr.dto.POIDTO;
import br.tourapp.kyr.dto.PontoDTO;
import br.tourapp.kyr.dto.RoteiroRequestDTO;
import br.tourapp.kyr.dto.RoteiroResponseDTO;
import br.tourapp.kyr.dto.TrechoRotaDTO;
import br.tourapp.kyr.iaservice.client.IaServiceClient;
import br.tourapp.kyr.iaservice.client.dto.CuradoriaResponseDto;
import br.tourapp.kyr.iaservice.client.dto.PontoBrutoDto;
import br.tourapp.kyr.iaservice.client.dto.PontoCuradoDto;
import br.tourapp.kyr.poi.model.Coordenada;
import br.tourapp.kyr.poi.model.PoiCandidato;
import br.tourapp.kyr.poi.model.PoisNaRota;
import br.tourapp.kyr.poi.service.RotaPoiService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;

// Orquestra o POST /roteiros: POIs do Places na rota informada → curadoria no ia-service → ordenação na Directions.
// Falha do Places propaga (vira 502); falha da curadoria ou da ordenação degrada a resposta, sem erro para o cliente.
@Service
public class RoteiroService {

    public static final String FONTE_IA_SEM_CURADORIA = "sem-curadoria";
    public static final String FONTE_ROTA_GOOGLE = "google-directions-api";
    public static final String FONTE_ROTA_FALLBACK = "fallback-sem-otimizacao";

    private static final Logger log = LoggerFactory.getLogger(RoteiroService.class);

    private final RotaPoiService rotaPoiService;
    private final IaServiceClient iaServiceClient;
    private final DirectionsService directionsService;
    private final int maxPoisCuradoria;

    public RoteiroService(RotaPoiService rotaPoiService, IaServiceClient iaServiceClient,
                          DirectionsService directionsService,
                          @Value("${roteiro.max-pois-curadoria:10}") int maxPoisCuradoria) {
        this.rotaPoiService = rotaPoiService;
        this.iaServiceClient = iaServiceClient;
        this.directionsService = directionsService;
        this.maxPoisCuradoria = maxPoisCuradoria;
    }

    public RoteiroResponseDTO gerarRoteiro(RoteiroRequestDTO request) {
        long inicio = System.currentTimeMillis();

        PoisNaRota poisNaRota = rotaPoiService.buscarPoisNaRota(
                paraCoordenada(request.origem()), paraCoordenada(request.destino()), null);

        List<PoiCandidato> selecionados = selecionarMaisBemAvaliados(poisNaRota.candidatos());
        if (selecionados.isEmpty()) {
            return montarResposta(List.of(), inicio, FONTE_IA_SEM_CURADORIA, false, FONTE_ROTA_FALLBACK);
        }

        Curadoria curadoria = curar(selecionados);
        Ordenacao ordenacao = ordenar(request, curadoria.pontos());

        return montarResposta(ordenacao.pontos(), inicio, curadoria.fonteIA(), curadoria.curadoPorIa(), ordenacao.fonteRota());
    }

    private List<PoiCandidato> selecionarMaisBemAvaliados(List<PoiCandidato> candidatos) {
        return candidatos.stream()
                .sorted(Comparator.comparing(PoiCandidato::nota, Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(Math.max(maxPoisCuradoria, 0))
                .toList();
    }

    private Curadoria curar(List<PoiCandidato> selecionados) {
        List<PontoBrutoDto> pontosBrutos = selecionados.stream()
                .map(poi -> new PontoBrutoDto(poi.nome(), poi.categoria(),
                        List.of(poi.coordenadas().latitude(), poi.coordenadas().longitude())))
                .toList();

        CuradoriaResponseDto resposta;
        try {
            resposta = iaServiceClient.curar(pontosBrutos);
        } catch (RuntimeException e) {
            log.warn("Falha na curadoria pelo ia-service, devolvendo roteiro sem curadoria: {}", e.getMessage());
            return semCuradoria(selecionados);
        }

        if (!resposta.curadoPorIa()) {
            return semCuradoria(selecionados);
        }

        List<PontoCuradoDto> curados = resposta.pontos();
        boolean mesmaOrdem = curados.size() == selecionados.size();
        Map<String, PontoCuradoDto> curadosPorNome = new HashMap<>();
        for (PontoCuradoDto curado : curados) {
            if (curado != null && curado.nome() != null) {
                curadosPorNome.putIfAbsent(curado.nome(), curado);
            }
        }

        List<POIDTO> pontos = new ArrayList<>(selecionados.size());
        for (int i = 0; i < selecionados.size(); i++) {
            PoiCandidato poi = selecionados.get(i);
            // O ia-service devolve os pontos na mesma ordem do envio; o nome é só a alternativa
            // para uma resposta de tamanho diferente.
            PontoCuradoDto curado = mesmaOrdem ? curados.get(i) : curadosPorNome.get(poi.nome());
            pontos.add(paraPonto(poi, curado));
        }

        String modelo = resposta.modeloUtilizado();
        String fonteIA = modelo != null && !modelo.isBlank() ? modelo : "ia-service";
        return new Curadoria(pontos, true, fonteIA);
    }

    private Curadoria semCuradoria(List<PoiCandidato> selecionados) {
        List<POIDTO> pontos = selecionados.stream().map(poi -> paraPonto(poi, null)).toList();
        return new Curadoria(pontos, false, FONTE_IA_SEM_CURADORIA);
    }

    private POIDTO paraPonto(PoiCandidato poi, PontoCuradoDto curado) {
        boolean foiCurado = curado != null && curado.curado();
        return new POIDTO(
                poi.nome(),
                foiCurado ? curado.trilha() : null,
                foiCurado ? curado.tipo() : null,
                poi.endereco(),
                poi.coordenadas().latitude(),
                poi.coordenadas().longitude(),
                poi.linkMaps(),
                foiCurado ? curado.descricao() : null,
                foiCurado,
                null,
                null);
    }

    private Ordenacao ordenar(RoteiroRequestDTO request, List<POIDTO> pontos) {
        try {
            List<PontoDTO> waypoints = pontos.stream()
                    .map(p -> new PontoDTO(p.nome(), p.latitude(), p.longitude()))
                    .toList();

            DirectionsService.ResultadoRota rota = directionsService.calcularRotaOtimizada(
                    request.origem(), request.destino(), waypoints);

            return new Ordenacao(aplicarOrdem(pontos, rota.ordemOtimizada(), rota.trechos()), FONTE_ROTA_GOOGLE);
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
                                              String fonteRota) {
        long tempoResposta = System.currentTimeMillis() - inicio;
        return new RoteiroResponseDTO(pontos, new MetadadosDTO(pontos.size(), tempoResposta, fonteIA, curadoPorIa, fonteRota));
    }

    private Coordenada paraCoordenada(PontoDTO ponto) {
        return new Coordenada(ponto.latitude(), ponto.longitude());
    }

    private record Curadoria(List<POIDTO> pontos, boolean curadoPorIa, String fonteIA) {
    }

    private record Ordenacao(List<POIDTO> pontos, String fonteRota) {
    }
}

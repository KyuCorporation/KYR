package br.tourapp.kyr.service;

import br.tourapp.kyr.dto.POIDTO;
import br.tourapp.kyr.dto.PontoDTO;
import br.tourapp.kyr.dto.RoteiroRequestDTO;
import br.tourapp.kyr.dto.RoteiroResponseDTO;
import br.tourapp.kyr.iaservice.client.IaServiceClient;
import br.tourapp.kyr.iaservice.client.dto.CuradoriaResponseDto;
import br.tourapp.kyr.iaservice.client.dto.PontoBrutoDto;
import br.tourapp.kyr.iaservice.client.dto.PontoCuradoDto;
import br.tourapp.kyr.iaservice.exception.IaServiceException;
import br.tourapp.kyr.poi.model.Coordenada;
import br.tourapp.kyr.poi.model.PoiCandidato;
import br.tourapp.kyr.poi.model.PoisNaRota;
import br.tourapp.kyr.poi.service.RotaPoiService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RoteiroServiceCacheTest {

    private static final RoteiroRequestDTO REQUEST = new RoteiroRequestDTO(
            new PontoDTO("Aeroporto", -25.6003, -54.4854), new PontoDTO("Centro", -25.5478, -54.5882));

    private static final PoiCandidato MARCO = new PoiCandidato("Marco das Três Fronteiras", new Coordenada(-25.59, -54.59),
            "tourist_attraction", 4.7, 30000, "Av. Gen. Meira", "https://maps.google.com/?cid=1", "place-marco");
    private static final PoiCandidato CAFE = new PoiCandidato("Café da Praça", new Coordenada(-25.54, -54.58),
            "cafe", 4.5, 900, "Praça da Paz", "https://maps.google.com/?cid=2", "place-cafe");

    @Mock
    private RotaPoiService rotaPoiService;

    @Mock
    private IaServiceClient iaServiceClient;

    @Mock
    private DirectionsService directionsService;

    @Captor
    private ArgumentCaptor<List<PontoBrutoDto>> pontosEnviados;

    private CacheEmMemoria cache;
    private RoteiroService service;

    @BeforeEach
    void setUp() {
        cache = new CacheEmMemoria();
        service = new RoteiroService(rotaPoiService, iaServiceClient, directionsService, 10, cache);
        when(rotaPoiService.buscarPoisNaRota(any(), any(), any())).thenReturn(new PoisNaRota(List.of(MARCO, CAFE), List.of()));
        // A ordenação não interessa a estes testes: com a Directions falhando, vale a ordem da seleção.
        when(directionsService.calcularRotaOtimizada(any(), any(), anyList())).thenThrow(new IllegalStateException("sem chave"));
    }

    @Test
    void naoChamaOIaServiceQuandoTodosOsLugaresJaForamCurados() {
        cache.dados.put("place-marco", new CuradoriaCache.Curada("turismo", "lazer", "Mirante na fronteira.", "gemini-3.5-flash-lite"));
        cache.dados.put("place-cafe", new CuradoriaCache.Curada("turismo", "alimentacao", "Café na praça.", "gemini-3.5-flash-lite"));

        RoteiroResponseDTO resposta = service.gerarRoteiro(REQUEST);

        verify(iaServiceClient, never()).curar(anyList());
        assertThat(resposta.pontos()).allMatch(POIDTO::curado);
        assertThat(resposta.pontos().get(0).descricao()).isEqualTo("Mirante na fronteira.");
        assertThat(resposta.pontos().get(0).placeId()).isEqualTo("place-marco");
        assertThat(resposta.metadados().curadoPorIa()).isTrue();
        assertThat(resposta.metadados().fonteIA()).isEqualTo("gemini-3.5-flash-lite");
    }

    @Test
    void enviaAoIaServiceSoOsLugaresQueAindaNaoEstaoNoCacheEGuardaOResultado() {
        cache.dados.put("place-marco", new CuradoriaCache.Curada("turismo", "lazer", "Mirante na fronteira.", "modelo-antigo"));
        when(iaServiceClient.curar(anyList())).thenReturn(new CuradoriaResponseDto(List.of(
                new PontoCuradoDto("Café da Praça", "cafe", List.of(-25.54, -54.58), "turismo", "alimentacao", "Café na praça.", true)),
                true, "gemini-3.5-flash-lite"));

        RoteiroResponseDTO resposta = service.gerarRoteiro(REQUEST);

        verify(iaServiceClient).curar(pontosEnviados.capture());
        assertThat(pontosEnviados.getValue()).extracting(PontoBrutoDto::nome).containsExactly("Café da Praça");
        assertThat(resposta.pontos()).extracting(POIDTO::descricao).containsExactly("Mirante na fronteira.", "Café na praça.");
        assertThat(resposta.metadados().fonteIA()).isEqualTo("gemini-3.5-flash-lite");
        assertThat(cache.dados.get("place-cafe"))
                .isEqualTo(new CuradoriaCache.Curada("turismo", "alimentacao", "Café na praça.", "gemini-3.5-flash-lite"));
    }

    @Test
    void usaOQueHaNoCacheMesmoQuandoOIaServiceFalha() {
        cache.dados.put("place-marco", new CuradoriaCache.Curada("turismo", "lazer", "Mirante na fronteira.", "gemini-3.5-flash-lite"));
        when(iaServiceClient.curar(anyList())).thenThrow(new IaServiceException("indisponível"));

        RoteiroResponseDTO resposta = service.gerarRoteiro(REQUEST);

        assertThat(resposta.pontos()).extracting(POIDTO::curado).containsExactly(true, false);
        assertThat(resposta.metadados().curadoPorIa()).isTrue();
        assertThat(cache.dados).containsOnlyKeys("place-marco");
    }

    @Test
    void naoGuardaNoCachePontoQueAIaNaoCurou() {
        when(iaServiceClient.curar(anyList())).thenReturn(new CuradoriaResponseDto(List.of(
                new PontoCuradoDto("Marco das Três Fronteiras", "tourist_attraction", List.of(-25.59, -54.59), "turismo", "lazer", "Mirante.", true),
                new PontoCuradoDto("Café da Praça", "cafe", List.of(-25.54, -54.58), null, null, null, false)),
                true, "gemini-3.5-flash-lite"));

        service.gerarRoteiro(REQUEST);

        assertThat(cache.dados).containsOnlyKeys("place-marco");
    }

    @Test
    void geraORoteiroMesmoComOCacheForaDoAr() {
        RoteiroService comCacheQuebrado = new RoteiroService(rotaPoiService, iaServiceClient, directionsService, 10,
                new CuradoriaCache() {
                    @Override
                    public Map<String, Curada> buscar(Collection<String> placeIds) {
                        throw new IllegalStateException("banco fora do ar");
                    }

                    @Override
                    public void salvar(Map<String, Curada> curadas) {
                        throw new IllegalStateException("banco fora do ar");
                    }
                });
        when(iaServiceClient.curar(anyList())).thenReturn(new CuradoriaResponseDto(List.of(
                new PontoCuradoDto("Marco das Três Fronteiras", "tourist_attraction", List.of(-25.59, -54.59), "turismo", "lazer", "Mirante.", true),
                new PontoCuradoDto("Café da Praça", "cafe", List.of(-25.54, -54.58), "turismo", "alimentacao", "Café.", true)),
                true, "gemini-3.5-flash-lite"));

        RoteiroResponseDTO resposta = comCacheQuebrado.gerarRoteiro(REQUEST);

        assertThat(resposta.pontos()).hasSize(2).allMatch(POIDTO::curado);
    }

    private static final class CacheEmMemoria implements CuradoriaCache {
        private final Map<String, Curada> dados = new HashMap<>();

        @Override
        public Map<String, Curada> buscar(Collection<String> placeIds) {
            Map<String, Curada> achados = new HashMap<>();
            placeIds.forEach(id -> {
                if (dados.containsKey(id)) {
                    achados.put(id, dados.get(id));
                }
            });
            return achados;
        }

        @Override
        public void salvar(Map<String, Curada> curadas) {
            dados.putAll(curadas);
        }
    }
}

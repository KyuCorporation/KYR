package br.tourapp.kyr.service;

import br.tourapp.kyr.dto.POIDTO;
import br.tourapp.kyr.dto.PontoDTO;
import br.tourapp.kyr.dto.RoteiroRequestDTO;
import br.tourapp.kyr.dto.RoteiroResponseDTO;
import br.tourapp.kyr.dto.TrechoRotaDTO;
import br.tourapp.kyr.iaservice.client.IaServiceClient;
import br.tourapp.kyr.iaservice.client.dto.CuradoriaResponseDto;
import br.tourapp.kyr.iaservice.client.dto.PontoBrutoDto;
import br.tourapp.kyr.iaservice.client.dto.PontoCuradoDto;
import br.tourapp.kyr.iaservice.exception.IaServiceException;
import br.tourapp.kyr.poi.exception.GoogleMapsIntegrationException;
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

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RoteiroServiceTest {

    private static final PontoDTO ORIGEM = new PontoDTO("Palmares", -8.6841, -35.5892);
    private static final PontoDTO DESTINO = new PontoDTO("Recife", -8.0476, -34.8770);
    private static final RoteiroRequestDTO REQUEST = new RoteiroRequestDTO(ORIGEM, DESTINO);

    private static final PoiCandidato MERCADO = new PoiCandidato("Mercado de São José", new Coordenada(-8.0689, -34.8786),
            "market", 4.4, "Praça Dom Vital, Recife - PE", "https://maps.google.com/?cid=1");
    private static final PoiCandidato MUSEU = new PoiCandidato("Museu do Homem do Nordeste", new Coordenada(-8.0312, -34.9189),
            "museum", 4.7, "Av. Dezessete de Agosto, Recife - PE", "https://maps.google.com/?cid=2");

    @Mock
    private RotaPoiService rotaPoiService;

    @Mock
    private IaServiceClient iaServiceClient;

    @Mock
    private DirectionsService directionsService;

    @Captor
    private ArgumentCaptor<List<PontoBrutoDto>> pontosEnviados;

    private RoteiroService service;

    @BeforeEach
    void setUp() {
        service = new RoteiroService(rotaPoiService, iaServiceClient, directionsService, 10);
    }

    @Test
    void deveGerarRoteiroCuradoEOrdenadoComPoisDaRotaInformada() {
        placesDevolve(MERCADO, MUSEU);
        // Seleção por nota: Museu (4.7) vem antes do Mercado (4.4).
        when(iaServiceClient.curar(anyList())).thenReturn(new CuradoriaResponseDto(List.of(
                curado(MUSEU, "turismo", "lazer", "Museu sobre a cultura nordestina."),
                curado(MERCADO, "compras", "alimentacao", "Mercado público tradicional.")),
                true, "gemini-2.5-flash"));
        when(directionsService.calcularRotaOtimizada(eq(ORIGEM), eq(DESTINO), anyList()))
                .thenReturn(new DirectionsService.ResultadoRota(List.of(1, 0), List.of(
                        new TrechoRotaDTO(1000, 120), new TrechoRotaDTO(2000, 240), new TrechoRotaDTO(3000, 360))));

        RoteiroResponseDTO resposta = service.gerarRoteiro(REQUEST);

        verify(rotaPoiService).buscarPoisNaRota(
                eq(new Coordenada(-8.6841, -35.5892)), eq(new Coordenada(-8.0476, -34.8770)), isNull());
        verify(iaServiceClient).curar(pontosEnviados.capture());
        assertThat(pontosEnviados.getValue()).containsExactly(
                new PontoBrutoDto("Museu do Homem do Nordeste", "museum", List.of(-8.0312, -34.9189)),
                new PontoBrutoDto("Mercado de São José", "market", List.of(-8.0689, -34.8786)));

        assertThat(resposta.pontos()).extracting(POIDTO::nome)
                .containsExactly("Mercado de São José", "Museu do Homem do Nordeste");

        POIDTO primeiro = resposta.pontos().get(0);
        assertThat(primeiro.trilha()).isEqualTo("compras");
        assertThat(primeiro.tipo()).isEqualTo("alimentacao");
        assertThat(primeiro.descricao()).isEqualTo("Mercado público tradicional.");
        assertThat(primeiro.curado()).isTrue();
        assertThat(primeiro.endereco()).isEqualTo("Praça Dom Vital, Recife - PE");
        assertThat(primeiro.fonte()).isEqualTo("https://maps.google.com/?cid=1");
        assertThat(primeiro.latitude()).isEqualTo(-8.0689);
        assertThat(primeiro.longitude()).isEqualTo(-34.8786);
        assertThat(primeiro.distanciaMetros()).isEqualTo(1000L);
        assertThat(primeiro.duracaoSegundos()).isEqualTo(120L);

        POIDTO segundo = resposta.pontos().get(1);
        assertThat(segundo.trilha()).isEqualTo("turismo");
        assertThat(segundo.distanciaMetros()).isEqualTo(2000L);
        assertThat(segundo.duracaoSegundos()).isEqualTo(240L);

        assertThat(resposta.metadados().totalPontos()).isEqualTo(2);
        assertThat(resposta.metadados().curadoPorIa()).isTrue();
        assertThat(resposta.metadados().fonteIA()).isEqualTo("gemini-2.5-flash");
        assertThat(resposta.metadados().fonteRota()).isEqualTo("google-directions-api");
        assertThat(resposta.metadados().tempoRespostaMs()).isGreaterThanOrEqualTo(0);
    }

    @Test
    void deveMarcarComoNaoCuradoOPoiQueOIaServiceNaoCurou() {
        placesDevolve(MUSEU, MERCADO);
        when(iaServiceClient.curar(anyList())).thenReturn(new CuradoriaResponseDto(List.of(
                curado(MUSEU, "turismo", "lazer", "Museu sobre a cultura nordestina."),
                new PontoCuradoDto(MERCADO.nome(), MERCADO.categoria(), List.of(-8.0689, -34.8786), null, null, null, false)),
                true, "claude-haiku-4-5-20251001"));
        ordenacaoMantemAOrdem(2);

        RoteiroResponseDTO resposta = service.gerarRoteiro(REQUEST);

        POIDTO museu = resposta.pontos().get(0);
        assertThat(museu.curado()).isTrue();
        assertThat(museu.descricao()).isEqualTo("Museu sobre a cultura nordestina.");

        POIDTO mercado = resposta.pontos().get(1);
        assertThat(mercado.curado()).isFalse();
        assertThat(mercado.trilha()).isNull();
        assertThat(mercado.tipo()).isNull();
        assertThat(mercado.descricao()).isNull();
        assertThat(mercado.endereco()).isEqualTo("Praça Dom Vital, Recife - PE");

        assertThat(resposta.metadados().curadoPorIa()).isTrue();
        assertThat(resposta.metadados().fonteIA()).isEqualTo("claude-haiku-4-5-20251001");
    }

    @Test
    void deveDevolverRoteiroSemCuradoriaQuandoOIaServiceFalha() {
        placesDevolve(MUSEU, MERCADO);
        when(iaServiceClient.curar(anyList()))
                .thenThrow(new IaServiceException("Falha de comunicação com o ia-service (ResourceAccessException)"));
        ordenacaoMantemAOrdem(2);

        RoteiroResponseDTO resposta = service.gerarRoteiro(REQUEST);

        assertThat(resposta.pontos()).hasSize(2);
        assertThat(resposta.pontos()).allSatisfy(ponto -> {
            assertThat(ponto.curado()).isFalse();
            assertThat(ponto.trilha()).isNull();
            assertThat(ponto.tipo()).isNull();
            assertThat(ponto.descricao()).isNull();
        });
        assertThat(resposta.metadados().curadoPorIa()).isFalse();
        assertThat(resposta.metadados().fonteIA()).isEqualTo("sem-curadoria");
        assertThat(resposta.metadados().fonteRota()).isEqualTo("google-directions-api");
    }

    @Test
    void deveDevolverRoteiroSemCuradoriaQuandoNenhumProvedorDoIaServiceRespondeu() {
        placesDevolve(MUSEU);
        when(iaServiceClient.curar(anyList())).thenReturn(new CuradoriaResponseDto(List.of(
                new PontoCuradoDto(MUSEU.nome(), MUSEU.categoria(), List.of(-8.0312, -34.9189), null, null, null, false)),
                false, null));
        ordenacaoMantemAOrdem(1);

        RoteiroResponseDTO resposta = service.gerarRoteiro(REQUEST);

        assertThat(resposta.pontos().get(0).curado()).isFalse();
        assertThat(resposta.metadados().curadoPorIa()).isFalse();
        assertThat(resposta.metadados().fonteIA()).isEqualTo("sem-curadoria");
    }

    @Test
    void deveManterAOrdemOriginalQuandoADirectionsFalha() {
        placesDevolve(MERCADO, MUSEU);
        when(iaServiceClient.curar(anyList())).thenReturn(new CuradoriaResponseDto(List.of(
                curado(MUSEU, "turismo", "lazer", "Museu sobre a cultura nordestina."),
                curado(MERCADO, "compras", "alimentacao", "Mercado público tradicional.")),
                true, "gemini-2.5-flash"));
        when(directionsService.calcularRotaOtimizada(any(), any(), anyList()))
                .thenThrow(new IllegalStateException("Directions API retornou status: OVER_QUERY_LIMIT"));

        RoteiroResponseDTO resposta = service.gerarRoteiro(REQUEST);

        assertThat(resposta.pontos()).extracting(POIDTO::nome)
                .containsExactly("Museu do Homem do Nordeste", "Mercado de São José");
        assertThat(resposta.pontos()).allSatisfy(ponto -> {
            assertThat(ponto.distanciaMetros()).isNull();
            assertThat(ponto.duracaoSegundos()).isNull();
            assertThat(ponto.curado()).isTrue();
        });
        assertThat(resposta.metadados().fonteRota()).isEqualTo("fallback-sem-otimizacao");
        assertThat(resposta.metadados().fonteIA()).isEqualTo("gemini-2.5-flash");
    }

    @Test
    void deveManterAOrdemOriginalQuandoADirectionsDevolveOrdemIncompativel() {
        placesDevolve(MUSEU, MERCADO);
        when(iaServiceClient.curar(anyList())).thenThrow(new IaServiceException("indisponível"));
        when(directionsService.calcularRotaOtimizada(any(), any(), anyList()))
                .thenReturn(new DirectionsService.ResultadoRota(List.of(0), List.of(new TrechoRotaDTO(1000, 120))));

        RoteiroResponseDTO resposta = service.gerarRoteiro(REQUEST);

        assertThat(resposta.pontos()).hasSize(2);
        assertThat(resposta.metadados().fonteRota()).isEqualTo("fallback-sem-otimizacao");
    }

    @Test
    void deveResponderVazioSemChamarIaServiceNemDirectionsQuandoOPlacesNaoEncontraPois() {
        placesDevolve();

        RoteiroResponseDTO resposta = service.gerarRoteiro(REQUEST);

        assertThat(resposta.pontos()).isEmpty();
        assertThat(resposta.metadados().totalPontos()).isZero();
        assertThat(resposta.metadados().curadoPorIa()).isFalse();
        assertThat(resposta.metadados().fonteIA()).isEqualTo("sem-curadoria");
        verifyNoInteractions(iaServiceClient, directionsService);
    }

    @Test
    void deveEnviarACuradoriaApenasOsPoisDeMaiorNotaAteOLimite() {
        List<PoiCandidato> candidatos = new ArrayList<>();
        candidatos.add(new PoiCandidato("Sem nota", new Coordenada(-8.1, -35.0), "store", null, null, null));
        for (int i = 1; i <= 24; i++) {
            // Notas de 2.6 a 4.9, embaralhadas em relação à ordem de chegada.
            double nota = 2.5 + ((i * 7) % 24 + 1) / 10.0;
            candidatos.add(new PoiCandidato("POI " + nota, new Coordenada(-8.1, -35.0), "store", nota, null, null));
        }
        when(rotaPoiService.buscarPoisNaRota(any(), any(), any())).thenReturn(new PoisNaRota(candidatos, List.of()));
        when(iaServiceClient.curar(anyList())).thenThrow(new IaServiceException("indisponível"));
        ordenacaoMantemAOrdem(10);

        RoteiroResponseDTO resposta = service.gerarRoteiro(REQUEST);

        verify(iaServiceClient).curar(pontosEnviados.capture());
        assertThat(pontosEnviados.getValue()).hasSize(10);
        assertThat(pontosEnviados.getValue()).extracting(PontoBrutoDto::nome).containsExactly(
                "POI 4.9", "POI 4.8", "POI 4.7", "POI 4.6", "POI 4.5",
                "POI 4.4", "POI 4.3", "POI 4.2", "POI 4.1", "POI 4.0");
        assertThat(resposta.pontos()).hasSize(10);
        assertThat(resposta.metadados().totalPontos()).isEqualTo(10);
    }

    @Test
    void deveDeixarPoisSemNotaPorUltimoNaSelecao() {
        PoiCandidato semNota = new PoiCandidato("Sem nota", new Coordenada(-8.1, -35.0), "store", null, null, null);
        placesDevolve(semNota, MERCADO, MUSEU);
        when(iaServiceClient.curar(anyList())).thenThrow(new IaServiceException("indisponível"));
        when(directionsService.calcularRotaOtimizada(any(), any(), anyList()))
                .thenThrow(new IllegalStateException("GOOGLE_MAPS_API_KEY não configurada."));

        RoteiroResponseDTO resposta = service.gerarRoteiro(REQUEST);

        assertThat(resposta.pontos()).extracting(POIDTO::nome)
                .containsExactly("Museu do Homem do Nordeste", "Mercado de São José", "Sem nota");
    }

    @Test
    void devePropagarAFalhaDoPlacesSemChamarIaServiceNemDirections() {
        when(rotaPoiService.buscarPoisNaRota(any(), any(), any())).thenThrow(new GoogleMapsIntegrationException(
                "Chave da API do Google Maps não configurada (variável de ambiente GOOGLE_MAPS_API_KEY)"));

        assertThatThrownBy(() -> service.gerarRoteiro(REQUEST)).isInstanceOf(GoogleMapsIntegrationException.class);

        verifyNoInteractions(iaServiceClient, directionsService);
    }

    private void placesDevolve(PoiCandidato... candidatos) {
        when(rotaPoiService.buscarPoisNaRota(any(), any(), any()))
                .thenReturn(new PoisNaRota(List.of(candidatos), List.of()));
    }

    private void ordenacaoMantemAOrdem(int totalDePontos) {
        List<Integer> ordem = new ArrayList<>();
        List<TrechoRotaDTO> trechos = new ArrayList<>();
        for (int i = 0; i < totalDePontos; i++) {
            ordem.add(i);
            trechos.add(new TrechoRotaDTO(1000L * (i + 1), 120L * (i + 1)));
        }
        trechos.add(new TrechoRotaDTO(500, 60));
        when(directionsService.calcularRotaOtimizada(any(), any(), anyList()))
                .thenReturn(new DirectionsService.ResultadoRota(ordem, trechos));
    }

    private PontoCuradoDto curado(PoiCandidato poi, String trilha, String tipo, String descricao) {
        return new PontoCuradoDto(poi.nome(), poi.categoria(),
                List.of(poi.coordenadas().latitude(), poi.coordenadas().longitude()), trilha, tipo, descricao, true);
    }
}

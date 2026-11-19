package br.tourapp.kyr.service;

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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RoteiroServiceParadasTest {

    private static final PontoDTO ORIGEM = new PontoDTO("Aeroporto", -25.6003, -54.4854);
    private static final PontoDTO DESTINO = new PontoDTO("Centro", -25.5478, -54.5882);
    private static final PontoDTO PARADA = new PontoDTO("Parque das Aves", -25.6150, -54.4841);
    private static final PoiCandidato CAFE = new PoiCandidato("Café da Praça", new Coordenada(-25.54, -54.58),
            "cafe", 4.5, 900, "Praça da Paz", "https://maps.google.com/?cid=2", "place-cafe");

    @Mock
    private RotaPoiService rotaPoiService;

    @Mock
    private IaServiceClient iaServiceClient;

    @Mock
    private DirectionsService directionsService;

    @Captor
    private ArgumentCaptor<List<PontoDTO>> waypoints;

    @Captor
    private ArgumentCaptor<List<PontoBrutoDto>> enviadosParaIa;

    private RoteiroService service;

    @BeforeEach
    void setUp() {
        service = new RoteiroService(rotaPoiService, iaServiceClient, directionsService, 10);
    }

    @Test
    void buscaLugaresPelaRotaComParadasEOrdenaParadasELugaresJuntosSemCurarAParada() {
        when(rotaPoiService.buscarPoisNaRota(any(), any(), anyList(), eq("walking"), isNull()))
                .thenReturn(new PoisNaRota(List.of(CAFE), List.of()));
        when(iaServiceClient.curar(anyList())).thenReturn(new CuradoriaResponseDto(List.of(
                new PontoCuradoDto("Café da Praça", "cafe", List.of(-25.54, -54.58), "turismo", "alimentacao", "Café.", true)),
                true, "gemini-3.5-flash-lite"));
        // A Directions devolve o café (índice 1) antes da parada (índice 0).
        when(directionsService.calcularRotaOtimizada(eq(ORIGEM), eq(DESTINO), anyList(), eq("walking")))
                .thenReturn(new DirectionsService.ResultadoRota(List.of(1, 0), List.of(
                        new TrechoRotaDTO(800, 600), new TrechoRotaDTO(1500, 1200), new TrechoRotaDTO(900, 700))));

        RoteiroResponseDTO resposta = service.gerarRoteiro(
                new RoteiroRequestDTO(ORIGEM, DESTINO, List.of(PARADA), Transporte.WALKING));

        verify(rotaPoiService).buscarPoisNaRota(eq(new Coordenada(-25.6003, -54.4854)), eq(new Coordenada(-25.5478, -54.5882)),
                eq(List.of(new Coordenada(-25.6150, -54.4841))), eq("walking"), isNull());
        verify(iaServiceClient).curar(enviadosParaIa.capture());
        assertThat(enviadosParaIa.getValue()).extracting(PontoBrutoDto::nome).containsExactly("Café da Praça");
        verify(directionsService).calcularRotaOtimizada(eq(ORIGEM), eq(DESTINO), waypoints.capture(), eq("walking"));
        assertThat(waypoints.getValue()).extracting(PontoDTO::nome).containsExactly("Parque das Aves", "Café da Praça");

        assertThat(resposta.pontos()).extracting(POIDTO::nome).containsExactly("Café da Praça", "Parque das Aves");
        POIDTO parada = resposta.pontos().get(1);
        assertThat(parada.parada()).isTrue();
        assertThat(parada.curado()).isFalse();
        assertThat(parada.distanciaMetros()).isEqualTo(1500L);
        assertThat(resposta.pontos().get(0).parada()).isFalse();
        assertThat(resposta.metadados().transporte()).isEqualTo("WALKING");
        assertThat(resposta.metadados().totalPontos()).isEqualTo(2);
        assertThat(resposta.metadados().fonteRota()).isEqualTo(RoteiroService.FONTE_ROTA_GOOGLE);
    }

    @Test
    void transportePublicoBuscaPelaRotaDeCarroENaoOtimiza() {
        when(rotaPoiService.buscarPoisNaRota(any(), any(), anyList(), eq("driving"), isNull()))
                .thenReturn(new PoisNaRota(List.of(CAFE), List.of()));
        when(iaServiceClient.curar(anyList())).thenReturn(new CuradoriaResponseDto(List.of(), false, null));

        RoteiroResponseDTO resposta = service.gerarRoteiro(
                new RoteiroRequestDTO(ORIGEM, DESTINO, List.of(PARADA), Transporte.TRANSIT));

        verifyNoInteractions(directionsService);
        assertThat(resposta.pontos()).extracting(POIDTO::nome).containsExactly("Parque das Aves", "Café da Praça");
        assertThat(resposta.metadados().fonteRota()).isEqualTo(RoteiroService.FONTE_ROTA_FALLBACK);
        assertThat(resposta.metadados().transporte()).isEqualTo("TRANSIT");
    }

    @Test
    void devolveAsParadasMesmoSemNenhumLugarSugeridoESemChamarAIa() {
        when(rotaPoiService.buscarPoisNaRota(any(), any(), anyList(), eq("driving"), isNull()))
                .thenReturn(new PoisNaRota(List.of(), List.of()));
        when(directionsService.calcularRotaOtimizada(eq(ORIGEM), eq(DESTINO), anyList()))
                .thenReturn(new DirectionsService.ResultadoRota(List.of(0), List.of(
                        new TrechoRotaDTO(1000, 120), new TrechoRotaDTO(2000, 240))));

        RoteiroResponseDTO resposta = service.gerarRoteiro(new RoteiroRequestDTO(ORIGEM, DESTINO, List.of(PARADA), null));

        verifyNoInteractions(iaServiceClient);
        assertThat(resposta.pontos()).singleElement().satisfies(p -> {
            assertThat(p.parada()).isTrue();
            assertThat(p.distanciaMetros()).isEqualTo(1000L);
        });
        assertThat(resposta.metadados().transporte()).isEqualTo("DRIVING");
    }

    @Test
    void semRotaDeBicicletaBuscaOsLugaresPelaRotaDeCarroEmVezDeFalhar() {
        when(rotaPoiService.buscarPoisNaRota(any(), any(), anyList(), eq("bicycling"), isNull()))
                .thenThrow(new GoogleMapsIntegrationException("Directions API retornou status ZERO_RESULTS"));
        when(rotaPoiService.buscarPoisNaRota(any(), any(), anyList(), eq("driving"), isNull()))
                .thenReturn(new PoisNaRota(List.of(), List.of()));

        RoteiroResponseDTO resposta = service.gerarRoteiro(new RoteiroRequestDTO(ORIGEM, DESTINO, null, Transporte.BICYCLING));

        verify(rotaPoiService).buscarPoisNaRota(any(), any(), anyList(), eq("driving"), isNull());
        assertThat(resposta.pontos()).isEmpty();
        assertThat(resposta.metadados().transporte()).isEqualTo("BICYCLING");
    }

    @Test
    void semParadasEDeCarroUsaAChamadaDeAntes() {
        when(rotaPoiService.buscarPoisNaRota(any(), any(), isNull())).thenReturn(new PoisNaRota(List.of(), List.of()));

        RoteiroResponseDTO resposta = service.gerarRoteiro(new RoteiroRequestDTO(ORIGEM, DESTINO));

        assertThat(resposta.pontos()).isEmpty();
        assertThat(resposta.metadados().transporte()).isEqualTo("DRIVING");
        verifyNoInteractions(iaServiceClient, directionsService);
    }
}

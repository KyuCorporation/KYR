package br.tourapp.kyr.poi.service;

import br.tourapp.kyr.poi.client.GoogleDirectionsClient;
import br.tourapp.kyr.poi.client.GooglePlacesClient;
import br.tourapp.kyr.poi.client.dto.DirectionsLegDto;
import br.tourapp.kyr.poi.client.dto.DirectionsResponseDto;
import br.tourapp.kyr.poi.client.dto.DirectionsRouteDto;
import br.tourapp.kyr.poi.client.dto.DirectionsStepDto;
import br.tourapp.kyr.poi.client.dto.DisplayNameDto;
import br.tourapp.kyr.poi.client.dto.GooglePlaceDto;
import br.tourapp.kyr.poi.client.dto.LatLngDto;
import br.tourapp.kyr.poi.client.dto.OverviewPolylineDto;
import br.tourapp.kyr.poi.client.dto.PlaceLocationDto;
import br.tourapp.kyr.poi.config.GoogleMapsProperties;
import br.tourapp.kyr.poi.exception.GoogleMapsIntegrationException;
import br.tourapp.kyr.poi.model.Coordenada;
import br.tourapp.kyr.poi.model.PoisNaRota;
import br.tourapp.kyr.poi.web.RotaResponseDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RotaPoiServiceRotaInformadaTest {

    private static final String POLYLINE_DE_EXEMPLO = "_p~iF~ps|U_ulLnnqC_mqNvxq`@";

    private static final Coordenada ORIGEM_FIXA = new Coordenada(-25.60028, -54.48500);
    private static final Coordenada DESTINO_FIXO = new Coordenada(-25.59680, -54.56250);
    private static final Coordenada ORIGEM_INFORMADA = new Coordenada(-8.6841, -35.5892);
    private static final Coordenada DESTINO_INFORMADO = new Coordenada(-8.0476, -34.8770);

    @Mock
    private GoogleDirectionsClient directionsClient;

    @Mock
    private GooglePlacesClient placesClient;

    private RotaPoiService service;

    @BeforeEach
    void setUp() {
        GoogleMapsProperties properties = new GoogleMapsProperties(
                "chave-de-teste",
                new GoogleMapsProperties.Directions("https://maps.googleapis.com"),
                new GoogleMapsProperties.Places("https://places.googleapis.com", "/v1/places:searchNearby"),
                new GoogleMapsProperties.Poi(500, 5, 10),
                new GoogleMapsProperties.Rota(ORIGEM_FIXA, DESTINO_FIXO));

        service = new RotaPoiService(directionsClient, placesClient, new PoiNormalizer(), properties);
    }

    @Test
    void deveUsarOrigemEDestinoInformadosEDevolverCandidatosComEnderecoELink() {
        when(directionsClient.buscarRota(ORIGEM_INFORMADA, DESTINO_INFORMADO)).thenReturn(rotaComDoisTrechos());
        when(placesClient.buscarProximos(any(), anyInt())).thenReturn(List.of(placeCompleto()));

        PoisNaRota resultado = service.buscarPoisNaRota(ORIGEM_INFORMADA, DESTINO_INFORMADO, 300);

        verify(directionsClient).buscarRota(ORIGEM_INFORMADA, DESTINO_INFORMADO);
        verify(placesClient).buscarProximos(eq(new Coordenada(-8.5, -35.4)), eq(300));
        verify(placesClient).buscarProximos(eq(new Coordenada(-8.2, -35.0)), eq(300));

        assertThat(resultado.candidatos()).hasSize(1);
        assertThat(resultado.candidatos().get(0).nome()).isEqualTo("Mercado de São José");
        assertThat(resultado.candidatos().get(0).endereco()).isEqualTo("Praça Dom Vital, Recife - PE");
        assertThat(resultado.candidatos().get(0).linkMaps()).isEqualTo("https://maps.google.com/?cid=456");
        assertThat(resultado.rota()).hasSize(3);
    }

    @Test
    void deveUsarORaioPadraoQuandoNaoInformado() {
        when(directionsClient.buscarRota(any(), any())).thenReturn(rotaComDoisTrechos());
        when(placesClient.buscarProximos(any(), anyInt())).thenReturn(List.of());

        PoisNaRota resultado = service.buscarPoisNaRota(ORIGEM_INFORMADA, DESTINO_INFORMADO, null);

        verify(placesClient).buscarProximos(eq(new Coordenada(-8.5, -35.4)), eq(500));
        assertThat(resultado.candidatos()).isEmpty();
    }

    @Test
    void deveManterARotaFixaDaConfiguracaoNoMetodoAntigo() {
        when(directionsClient.buscarRota(any(), any())).thenReturn(rotaComDoisTrechos());
        when(placesClient.buscarProximos(any(), anyInt())).thenReturn(List.of(placeCompleto()));

        RotaResponseDto resultado = service.buscarRoteiro(null);

        verify(directionsClient).buscarRota(ORIGEM_FIXA, DESTINO_FIXO);
        assertThat(resultado.pois()).hasSize(1);
        assertThat(resultado.pois().get(0).nome()).isEqualTo("Mercado de São José");
        assertThat(resultado.pois().get(0).categoria()).isEqualTo("market");
        assertThat(resultado.pois().get(0).nota()).isEqualTo(4.4);
        assertThat(resultado.rota()).hasSize(3);
    }

    @Test
    void devePropagarErroTratavelQuandoARotaInformadaFalha() {
        when(directionsClient.buscarRota(any(), any()))
                .thenThrow(new GoogleMapsIntegrationException("Directions API retornou status ZERO_RESULTS"));

        assertThatThrownBy(() -> service.buscarPoisNaRota(ORIGEM_INFORMADA, DESTINO_INFORMADO, null))
                .isInstanceOf(GoogleMapsIntegrationException.class);

        verifyNoInteractions(placesClient);
    }

    private DirectionsResponseDto rotaComDoisTrechos() {
        return new DirectionsResponseDto("OK", null, List.of(
                new DirectionsRouteDto(
                        List.of(new DirectionsLegDto(List.of(
                                new DirectionsStepDto(new LatLngDto(-8.6841, -35.5892), new LatLngDto(-8.5, -35.4)),
                                new DirectionsStepDto(new LatLngDto(-8.5, -35.4), new LatLngDto(-8.2, -35.0))))),
                        new OverviewPolylineDto(POLYLINE_DE_EXEMPLO))));
    }

    private GooglePlaceDto placeCompleto() {
        return new GooglePlaceDto(
                "id-1",
                new DisplayNameDto("Mercado de São José", "pt-BR"),
                new PlaceLocationDto(-8.0689, -34.8786),
                "market",
                List.of("market"),
                4.4,
                "Praça Dom Vital, Recife - PE",
                "https://maps.google.com/?cid=456");
    }
}

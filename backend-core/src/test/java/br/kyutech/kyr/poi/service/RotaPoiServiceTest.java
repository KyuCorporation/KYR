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
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RotaPoiServiceTest {

    private static final String POLYLINE_DE_EXEMPLO = "_p~iF~ps|U_ulLnnqC_mqNvxq`@";

    @Mock
    private GoogleDirectionsClient directionsClient;

    @Mock
    private GooglePlacesClient placesClient;

    private RotaPoiService service;

    private final GoogleMapsProperties properties = new GoogleMapsProperties(
            "chave-de-teste",
            new GoogleMapsProperties.Directions("https://maps.googleapis.com"),
            new GoogleMapsProperties.Places("https://places.googleapis.com", "/v1/places:searchNearby"),
            new GoogleMapsProperties.Poi(500, 5, 10),
            new GoogleMapsProperties.Rota(
                    new Coordenada(-25.60028, -54.48500),
                    new Coordenada(-25.59680, -54.56250))
    );

    @BeforeEach
    void setUp() {
        service = new RotaPoiService(directionsClient, placesClient, new PoiNormalizer(), properties);
    }

    @Test
    void deveRetornarPoisNormalizadosSemDuplicatasEALinhaDaRotaDecodificada() {
        DirectionsResponseDto rota = new DirectionsResponseDto("OK", null, List.of(
                new DirectionsRouteDto(
                        List.of(
                                new DirectionsLegDto(List.of(
                                        new DirectionsStepDto(
                                                new LatLngDto(-25.599, -54.487),
                                                new LatLngDto(-25.598, -54.486)),
                                        new DirectionsStepDto(
                                                new LatLngDto(-25.598, -54.486),
                                                new LatLngDto(-25.597, -54.485))
                                ))
                        ),
                        new OverviewPolylineDto(POLYLINE_DE_EXEMPLO))
        ));
        when(directionsClient.buscarRota(any(), any())).thenReturn(rota);

        GooglePlaceDto place = new GooglePlaceDto(
                "id-1",
                new DisplayNameDto("Loja X", "pt-BR"),
                new PlaceLocationDto(-25.598, -54.486),
                "store",
                List.of("store"),
                4.5);
        when(placesClient.buscarProximos(any(), anyInt())).thenReturn(List.of(place));

        RotaResponseDto resultado = service.buscarRoteiro(null);

        assertThat(resultado.pois()).hasSize(1);
        assertThat(resultado.pois().get(0).nome()).isEqualTo("Loja X");
        assertThat(resultado.pois().get(0).nota()).isEqualTo(4.5);

        assertThat(resultado.rota()).hasSize(3);
        assertThat(resultado.rota().get(0).latitude()).isEqualTo(38.5, org.assertj.core.data.Offset.offset(1e-4));
        assertThat(resultado.rota().get(0).longitude()).isEqualTo(-120.2, org.assertj.core.data.Offset.offset(1e-4));
    }

    @Test
    void devePropagarErroTratavelQuandoDirectionsApiFalha() {
        when(directionsClient.buscarRota(any(), any()))
                .thenThrow(new GoogleMapsIntegrationException("Directions API retornou status OVER_QUERY_LIMIT"));

        assertThatThrownBy(() -> service.buscarRoteiro(null))
                .isInstanceOf(GoogleMapsIntegrationException.class);

        verifyNoInteractions(placesClient);
    }

    @Test
    void devePropagarErroTratavelQuandoRotaSemTrechos() {
        DirectionsResponseDto rotaSemTrechos = new DirectionsResponseDto("OK", null, List.of());
        when(directionsClient.buscarRota(any(), any())).thenReturn(rotaSemTrechos);

        assertThatThrownBy(() -> service.buscarRoteiro(null))
                .isInstanceOf(GoogleMapsIntegrationException.class);
    }

    @Test
    void devePropagarErroTratavelQuandoRotaSemOverviewPolyline() {
        DirectionsResponseDto rota = new DirectionsResponseDto("OK", null, List.of(
                new DirectionsRouteDto(
                        List.of(new DirectionsLegDto(List.of(
                                new DirectionsStepDto(
                                        new LatLngDto(-25.599, -54.487),
                                        new LatLngDto(-25.598, -54.486))
                        ))),
                        null)
        ));
        when(directionsClient.buscarRota(any(), any())).thenReturn(rota);

        assertThatThrownBy(() -> service.buscarRoteiro(null))
                .isInstanceOf(GoogleMapsIntegrationException.class);
    }
}

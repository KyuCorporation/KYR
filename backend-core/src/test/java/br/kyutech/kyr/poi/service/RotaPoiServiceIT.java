package br.tourapp.kyr.poi.service;

import br.tourapp.kyr.poi.client.GoogleDirectionsClient;
import br.tourapp.kyr.poi.client.GooglePlacesClient;
import br.tourapp.kyr.poi.config.GoogleMapsProperties;
import br.tourapp.kyr.poi.model.Coordenada;
import br.tourapp.kyr.poi.web.RotaResponseDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.web.client.RestClient;

import static org.assertj.core.api.Assertions.assertThat;

@Tag("integration")
@EnabledIfEnvironmentVariable(named = "GOOGLE_MAPS_API_KEY", matches = ".+")
class RotaPoiServiceIT {

    private RotaPoiService service;

    @BeforeEach
    void setUp() {
        GoogleMapsProperties properties = new GoogleMapsProperties(
                System.getenv("GOOGLE_MAPS_API_KEY"),
                new GoogleMapsProperties.Directions("https://maps.googleapis.com"),
                new GoogleMapsProperties.Places("https://places.googleapis.com", "/v1/places:searchNearby"),
                new GoogleMapsProperties.Poi(500, 6, 10),
                new GoogleMapsProperties.Rota(
                        new Coordenada(-25.60028, -54.48500),
                        new Coordenada(-25.59680, -54.56250))
        );

        RestClient directionsRestClient = RestClient.builder().baseUrl(properties.directions().baseUrl()).build();
        RestClient placesRestClient = RestClient.builder().baseUrl(properties.places().baseUrl()).build();

        GoogleDirectionsClient directionsClient = new GoogleDirectionsClient(directionsRestClient, properties);
        GooglePlacesClient placesClient = new GooglePlacesClient(placesRestClient, properties);

        service = new RotaPoiService(directionsClient, placesClient, new PoiNormalizer(), properties);
    }

    @Test
    void deveRetornarAoMenosUmPoiEUmaLinhaDeRotaParaRotaAeroportoEvento() {
        RotaResponseDto resultado = service.buscarRoteiro(null);

        assertThat(resultado.pois()).isNotEmpty();
        assertThat(resultado.rota()).isNotEmpty();
    }
}

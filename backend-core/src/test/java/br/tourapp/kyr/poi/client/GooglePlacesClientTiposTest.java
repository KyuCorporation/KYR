package br.tourapp.kyr.poi.client;

import br.tourapp.kyr.poi.client.dto.GooglePlaceDto;
import br.tourapp.kyr.poi.config.GoogleMapsProperties;
import br.tourapp.kyr.poi.model.Coordenada;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasItems;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class GooglePlacesClientTiposTest {

    private static final String URL_PLACES = "https://places.googleapis.com/v1/places:searchNearby";

    private MockRestServiceServer server;
    private GooglePlacesClient client;

    @BeforeEach
    void setUp() {
        GoogleMapsProperties properties = new GoogleMapsProperties(
                "chave-de-teste",
                new GoogleMapsProperties.Directions("https://maps.googleapis.com"),
                new GoogleMapsProperties.Places("https://places.googleapis.com", "/v1/places:searchNearby"),
                new GoogleMapsProperties.Poi(500, 8, 10),
                new GoogleMapsProperties.Rota(new Coordenada(0, 0), new Coordenada(0, 0))
        );

        RestClient.Builder builder = RestClient.builder().baseUrl(properties.places().baseUrl());
        server = MockRestServiceServer.bindTo(builder).build();
        client = new GooglePlacesClient(builder.build(), properties);
    }

    @Test
    void deveBuscarSoTiposDeLugarQueCabemEmUmRoteiroTuristico() {
        server.expect(requestTo(URL_PLACES))
                .andExpect(jsonPath("$.includedTypes", hasItems("tourist_attraction", "museum", "park", "restaurant", "shopping_mall")))
                .andExpect(jsonPath("$.includedTypes", not(hasItems("taxi_stand"))))
                .andExpect(jsonPath("$.includedTypes", not(hasItems("lodging"))))
                .andExpect(jsonPath("$.maxResultCount").value(10))
                .andRespond(withSuccess("{\"places\": []}", MediaType.APPLICATION_JSON));

        assertThat(client.buscarProximos(new Coordenada(-25.6396, -54.4353), 500)).isEmpty();
        server.verify();
    }

    @Test
    void devePedirELerOTotalDeAvaliacoes() {
        server.expect(requestTo(URL_PLACES))
                .andExpect(header("X-Goog-FieldMask", containsString("places.userRatingCount")))
                .andRespond(withSuccess("""
                        {
                          "places": [
                            {
                              "id": "id-1",
                              "displayName": {"text": "Parque das Aves"},
                              "location": {"latitude": -25.6396, "longitude": -54.4353},
                              "primaryType": "tourist_attraction",
                              "rating": 4.8,
                              "userRatingCount": 51234
                            },
                            {
                              "id": "id-2",
                              "displayName": {"text": "Lugar sem avaliações"},
                              "location": {"latitude": -25.64, "longitude": -54.43}
                            }
                          ]
                        }
                        """, MediaType.APPLICATION_JSON));

        List<GooglePlaceDto> places = client.buscarProximos(new Coordenada(-25.6396, -54.4353), 500);

        assertThat(places.get(0).userRatingCount()).isEqualTo(51234);
        assertThat(places.get(1).userRatingCount()).isNull();
        server.verify();
    }
}

package br.kyutech.kyr.poi.client;

import br.kyutech.kyr.poi.config.GoogleMapsProperties;
import br.kyutech.kyr.poi.exception.GoogleMapsIntegrationException;
import br.kyutech.kyr.poi.model.Coordenada;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;

class GooglePlacesClientTest {

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
    void devePropagarErroTratavelQuandoChaveInvalida() {
        server.expect(requestTo("https://places.googleapis.com/v1/places:searchNearby"))
                .andRespond(withStatus(HttpStatus.FORBIDDEN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"error\":{\"code\":403,\"message\":\"API key not valid\"}}"));

        assertThatThrownBy(() -> client.buscarProximos(new Coordenada(-25.598, -54.486), 500))
                .isInstanceOf(GoogleMapsIntegrationException.class);
    }

    @Test
    void devePropagarErroTratavelQuandoRateLimitEstourado() {
        server.expect(requestTo("https://places.googleapis.com/v1/places:searchNearby"))
                .andRespond(withStatus(HttpStatus.TOO_MANY_REQUESTS));

        assertThatThrownBy(() -> client.buscarProximos(new Coordenada(-25.598, -54.486), 500))
                .isInstanceOf(GoogleMapsIntegrationException.class);
    }
}

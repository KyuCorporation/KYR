package br.tourapp.kyr.poi.client;

import br.tourapp.kyr.poi.config.GoogleMapsProperties;
import br.tourapp.kyr.poi.model.Coordenada;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.util.List;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.queryParam;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class GoogleDirectionsClientParadasTest {

    private static final String RESPOSTA_OK = "{\"status\": \"OK\", \"routes\": []}";

    private MockRestServiceServer server;
    private GoogleDirectionsClient client;

    @BeforeEach
    void setUp() {
        GoogleMapsProperties properties = new GoogleMapsProperties(
                "chave-de-teste",
                new GoogleMapsProperties.Directions("https://maps.googleapis.com"),
                new GoogleMapsProperties.Places("https://places.googleapis.com", "/v1/places:searchNearby"),
                new GoogleMapsProperties.Poi(500, 8, 10),
                new GoogleMapsProperties.Rota(new Coordenada(0, 0), new Coordenada(0, 0)));
        RestClient.Builder builder = RestClient.builder().baseUrl("https://maps.googleapis.com");
        server = MockRestServiceServer.bindTo(builder).build();
        client = new GoogleDirectionsClient(builder.build(), properties);
    }

    @Test
    void enviaAsParadasEmOrdemEOModoDeViagem() {
        server.expect(requestTo(containsString("/maps/api/directions/json")))
                .andExpect(queryParam("mode", "walking"))
                .andExpect(queryParam("waypoints", containsString("-25.615000,-54.484100")))
                .andExpect(queryParam("waypoints", containsString("-25.590000,-54.590000")))
                .andRespond(withSuccess(RESPOSTA_OK, MediaType.APPLICATION_JSON));

        client.buscarRota(new Coordenada(-25.6003, -54.4854), new Coordenada(-25.5478, -54.5882),
                List.of(new Coordenada(-25.615, -54.4841), new Coordenada(-25.59, -54.59)), "walking");
        server.verify();
    }

    @Test
    void semParadasNaoEnviaWaypoints() {
        server.expect(requestTo(not(containsString("waypoints"))))
                .andExpect(queryParam("mode", "driving"))
                .andRespond(withSuccess(RESPOSTA_OK, MediaType.APPLICATION_JSON));

        client.buscarRota(new Coordenada(-25.6003, -54.4854), new Coordenada(-25.5478, -54.5882));
        server.verify();
    }
}

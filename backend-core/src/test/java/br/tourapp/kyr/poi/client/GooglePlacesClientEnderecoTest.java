package br.tourapp.kyr.poi.client;

import br.tourapp.kyr.poi.client.dto.GooglePlaceDto;
import br.tourapp.kyr.poi.config.GoogleMapsProperties;
import br.tourapp.kyr.poi.exception.GoogleMapsIntegrationException;
import br.tourapp.kyr.poi.model.Coordenada;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class GooglePlacesClientEnderecoTest {

    private static final String CHAVE_SECRETA = "CHAVE-SECRETA-NAO-PODE-VAZAR";
    private static final String URL_PLACES = "https://places.googleapis.com/v1/places:searchNearby";

    private MockRestServiceServer server;
    private GooglePlacesClient client;

    @BeforeEach
    void setUp() {
        GoogleMapsProperties properties = new GoogleMapsProperties(
                CHAVE_SECRETA,
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
    void devePedirEnderecoELinkDoLugarNaMascaraDeCampos() {
        server.expect(requestTo(URL_PLACES))
                .andExpect(header("X-Goog-FieldMask", containsString("places.formattedAddress")))
                .andExpect(header("X-Goog-FieldMask", containsString("places.googleMapsUri")))
                .andExpect(header("X-Goog-FieldMask", containsString("places.rating")))
                .andRespond(withSuccess("""
                        {
                          "places": [
                            {
                              "id": "id-1",
                              "displayName": {"text": "Parque das Aves", "languageCode": "pt-BR"},
                              "location": {"latitude": -25.6396, "longitude": -54.4353},
                              "primaryType": "tourist_attraction",
                              "types": ["tourist_attraction"],
                              "rating": 4.8,
                              "formattedAddress": "Av. das Cataratas, 12450 - Foz do Iguaçu - PR",
                              "googleMapsUri": "https://maps.google.com/?cid=123"
                            }
                          ]
                        }
                        """, MediaType.APPLICATION_JSON));

        List<GooglePlaceDto> places = client.buscarProximos(new Coordenada(-25.6396, -54.4353), 500);

        assertThat(places).hasSize(1);
        assertThat(places.get(0).formattedAddress()).isEqualTo("Av. das Cataratas, 12450 - Foz do Iguaçu - PR");
        assertThat(places.get(0).googleMapsUri()).isEqualTo("https://maps.google.com/?cid=123");
        server.verify();
    }

    @Test
    void naoVazaAChaveNaMensagemQuandoOPlacesFalha() {
        server.expect(requestTo(URL_PLACES)).andRespond(withStatus(HttpStatus.FORBIDDEN));

        assertThatThrownBy(() -> client.buscarProximos(new Coordenada(-25.6396, -54.4353), 500))
                .isInstanceOf(GoogleMapsIntegrationException.class)
                .satisfies(ex -> assertThat(ex.getMessage()).doesNotContain(CHAVE_SECRETA));
    }
}

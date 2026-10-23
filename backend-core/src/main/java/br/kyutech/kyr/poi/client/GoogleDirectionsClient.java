package br.kyutech.kyr.poi.client;

import br.kyutech.kyr.poi.client.dto.DirectionsResponseDto;
import br.kyutech.kyr.poi.config.GoogleMapsProperties;
import br.kyutech.kyr.poi.exception.GoogleMapsIntegrationException;
import br.kyutech.kyr.poi.model.Coordenada;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.Locale;
import java.util.Optional;

@Component
public class GoogleDirectionsClient {

    private static final String DIRECTIONS_PATH = "/maps/api/directions/json";
    private static final String STATUS_OK = "OK";

    private final RestClient restClient;
    private final GoogleMapsProperties properties;

    public GoogleDirectionsClient(@Qualifier("directionsRestClient") RestClient restClient, GoogleMapsProperties properties) {
        this.restClient = restClient;
        this.properties = properties;
    }

    public DirectionsResponseDto buscarRota(Coordenada origem, Coordenada destino) {
        validarChaveConfigurada();

        DirectionsResponseDto resposta;
        try {
            resposta = restClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path(DIRECTIONS_PATH)
                            .queryParam("origin", formatarCoordenada(origem))
                            .queryParam("destination", formatarCoordenada(destino))
                            .queryParam("mode", "driving")
                            .queryParam("key", properties.apiKey())
                            .build())
                    .retrieve()
                    .body(DirectionsResponseDto.class);
        } catch (RestClientException ex) {
            throw new GoogleMapsIntegrationException(
                    "Falha de comunicação com a Directions API (" + ex.getClass().getSimpleName() + ")");
        }

        if (resposta == null) {
            throw new GoogleMapsIntegrationException("Resposta vazia da Directions API");
        }
        if (!STATUS_OK.equals(resposta.status())) {
            throw new GoogleMapsIntegrationException(
                    "Directions API retornou status " + resposta.status()
                            + Optional.ofNullable(resposta.errorMessage()).map(m -> ": " + m).orElse(""));
        }
        return resposta;
    }

    private void validarChaveConfigurada() {
        if (properties.apiKey() == null || properties.apiKey().isBlank()) {
            throw new GoogleMapsIntegrationException(
                    "Chave da API do Google Maps não configurada (variável de ambiente GOOGLE_MAPS_API_KEY)");
        }
    }

    private String formatarCoordenada(Coordenada coordenada) {
        return String.format(Locale.US, "%f,%f", coordenada.latitude(), coordenada.longitude());
    }
}

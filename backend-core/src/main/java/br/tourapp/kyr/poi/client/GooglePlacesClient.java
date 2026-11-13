package br.tourapp.kyr.poi.client;

import br.tourapp.kyr.poi.client.dto.CircleDto;
import br.tourapp.kyr.poi.client.dto.GooglePlaceDto;
import br.tourapp.kyr.poi.client.dto.LocationRestrictionDto;
import br.tourapp.kyr.poi.client.dto.NearbySearchRequestDto;
import br.tourapp.kyr.poi.client.dto.NearbySearchResponseDto;
import br.tourapp.kyr.poi.client.dto.PlaceLocationDto;
import br.tourapp.kyr.poi.config.GoogleMapsProperties;
import br.tourapp.kyr.poi.exception.GoogleMapsIntegrationException;
import br.tourapp.kyr.poi.model.Coordenada;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.List;

@Component
public class GooglePlacesClient {

    private static final String FIELD_MASK = "places.id,places.displayName,places.location,places.primaryType,places.types,places.rating,places.formattedAddress,places.googleMapsUri";

    private final RestClient restClient;
    private final GoogleMapsProperties properties;

    public GooglePlacesClient(@Qualifier("placesRestClient") RestClient restClient, GoogleMapsProperties properties) {
        this.restClient = restClient;
        this.properties = properties;
    }

    public List<GooglePlaceDto> buscarProximos(Coordenada centro, int raioMetros) {
        validarChaveConfigurada();

        NearbySearchRequestDto corpo = new NearbySearchRequestDto(new LocationRestrictionDto(new CircleDto(new PlaceLocationDto(centro.latitude(), centro.longitude()), raioMetros)), properties.poi().maxResultadosPorPonto()); //perdao para quem tiver lendo essa linha eu tb sofri pra fazer

        NearbySearchResponseDto resposta;

        try {
            resposta = restClient.post()
                    .uri(properties.places().searchNearbyPath())
                    .header("X-Goog-Api-Key", properties.apiKey())
                    .header("X-Goog-FieldMask", FIELD_MASK)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(corpo)
                    .retrieve()
                    .body(NearbySearchResponseDto.class);
        } catch (RestClientException ex) {
            throw new GoogleMapsIntegrationException("Falha de comunicação com a Places API (" + ex.getClass().getSimpleName() + ")");
        }

        return resposta != null && resposta.places() != null ? resposta.places() : List.of();
    }

    private void validarChaveConfigurada() {
        if (properties.apiKey() == null || properties.apiKey().isBlank()) {
            throw new GoogleMapsIntegrationException("Chave da API do Google Maps não configurada (variável de ambiente GOOGLE_MAPS_API_KEY)");
        }
    }
}

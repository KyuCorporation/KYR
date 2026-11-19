package br.tourapp.kyr.service;

import br.tourapp.kyr.dto.PontoDTO;
import br.tourapp.kyr.dto.TrechoRotaDTO;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;
 
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
 
@Service
public class DirectionsService {
 
    private static final String DIRECTIONS_URL = "https://maps.googleapis.com/maps/api/directions/json";
 
    private final RestTemplate restTemplate;
 
    @Value("${google.maps.api-key:}")
    private String apiKey;
 
    public DirectionsService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }
 
 
    public record ResultadoRota(List<Integer> ordemOtimizada, List<TrechoRotaDTO> trechos) {}
 

    public ResultadoRota calcularRotaOtimizada(PontoDTO origem, PontoDTO destino, List<PontoDTO> waypoints) {
        return calcularRotaOtimizada(origem, destino, waypoints, "driving");
    }

    public ResultadoRota calcularRotaOtimizada(PontoDTO origem, PontoDTO destino, List<PontoDTO> waypoints, String modo) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException("GOOGLE_MAPS_API_KEY não configurada.");
        }
 
        String waypointsParam = "optimize:true|" + waypoints.stream()
            .map(p -> p.latitude() + "," + p.longitude())
            .reduce((a, b) -> a + "|" + b)
            .orElse("");

        String url = UriComponentsBuilder.fromUriString(DIRECTIONS_URL)
            .queryParam("origin", origem.latitude() + "," + origem.longitude())
            .queryParam("destination", destino.latitude() + "," + destino.longitude())
            .queryParam("waypoints", waypointsParam)
            .queryParam("mode", modo)
            .queryParam("key", apiKey)
            .build()
            .toUriString();
 
        @SuppressWarnings("unchecked")
        Map<String, Object> response;
        try {
            response = restTemplate.getForObject(url, Map.class);
        } catch (RestClientException ex) {
            throw new IllegalStateException(
                "Falha de comunicação com a Directions API (" + ex.getClass().getSimpleName() + ")");
        }
 
        if (response == null || !"OK".equals(response.get("status"))) {
            String status = response != null ? String.valueOf(response.get("status")) : "SEM_RESPOSTA";
            throw new IllegalStateException("Directions API retornou status: " + status);
        }
 
        List<Map<String, Object>> routes = (List<Map<String, Object>>) response.get("routes");
        Map<String, Object> primeiraRota = routes.get(0);
 
        List<Integer> ordemOtimizada = (List<Integer>) primeiraRota.get("waypoint_order");
 
        List<Map<String, Object>> legs = (List<Map<String, Object>>) primeiraRota.get("legs");
        List<TrechoRotaDTO> trechos = new ArrayList<>();
        for (Map<String, Object> leg : legs) {
            Map<String, Object> distance = (Map<String, Object>) leg.get("distance");
            Map<String, Object> duration = (Map<String, Object>) leg.get("duration");
            trechos.add(new TrechoRotaDTO(
                ((Number) distance.get("value")).longValue(),
                ((Number) duration.get("value")).longValue()
            ));
        }
 
        return new ResultadoRota(ordemOtimizada, trechos);
    }
}
 


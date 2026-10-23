package br.kyutech.kyr.poi.config;

import br.kyutech.kyr.poi.model.Coordenada;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "google.maps")

public record GoogleMapsProperties(String apiKey, Directions directions, Places places, Poi poi, Rota rota) {
    public record Directions(String baseUrl) {
    }

    public record Places(String baseUrl, String searchNearbyPath) {
    }

    public record Poi(int raioBuscaMetros, int maxPontosIntermediarios, int maxResultadosPorPonto) {
    }

    public record Rota(Coordenada origem, Coordenada destino) {
    }
}

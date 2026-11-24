package br.tourapp.kyr.config;

import br.tourapp.kyr.poi.config.GoogleMapsClientConfig;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

// Usado pela ordenação na Directions API (DirectionsService), com o mesmo prazo dos clientes do Google.
@Configuration
public class RestTemplateConfig {

    @Bean
    public RestTemplate restTemplate(@Value("${google.maps.timeout-segundos:10}") int timeoutSegundos) {
        return new RestTemplate(GoogleMapsClientConfig.fabricaComTimeout(timeoutSegundos));
    }
}

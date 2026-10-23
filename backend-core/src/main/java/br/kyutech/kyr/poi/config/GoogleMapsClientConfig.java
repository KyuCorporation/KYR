package br.kyutech.kyr.poi.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

@Configuration
@EnableConfigurationProperties(GoogleMapsProperties.class)
public class GoogleMapsClientConfig {
    @Bean
    RestClient directionsRestClient(GoogleMapsProperties properties) {
        return RestClient.builder()
                .baseUrl(properties.directions().baseUrl())
                .build();
    }

    @Bean
    RestClient placesRestClient(GoogleMapsProperties properties) {
        return RestClient.builder()
                .baseUrl(properties.places().baseUrl())
                .build();
    }
}

package br.tourapp.kyr.poi.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.ClientHttpRequestFactory;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.time.Duration;

@Configuration
@EnableConfigurationProperties(GoogleMapsProperties.class)
public class GoogleMapsClientConfig {

    private static final Duration TIMEOUT_DE_CONEXAO = Duration.ofSeconds(5);

    // Sem prazo, uma chamada travada ao Google prende a thread da requisição indefinidamente.
    public static ClientHttpRequestFactory fabricaComTimeout(int segundosDeLeitura) {
        SimpleClientHttpRequestFactory fabrica = new SimpleClientHttpRequestFactory();
        fabrica.setConnectTimeout(TIMEOUT_DE_CONEXAO);
        fabrica.setReadTimeout(Duration.ofSeconds(Math.max(segundosDeLeitura, 1)));
        return fabrica;
    }

    @Bean
    RestClient directionsRestClient(GoogleMapsProperties properties,
                                    @Value("${google.maps.timeout-segundos:10}") int timeoutSegundos) {
        return RestClient.builder()
                .baseUrl(properties.directions().baseUrl())
                .requestFactory(fabricaComTimeout(timeoutSegundos))
                .build();
    }

    @Bean
    RestClient placesRestClient(GoogleMapsProperties properties,
                                @Value("${google.maps.timeout-segundos:10}") int timeoutSegundos) {
        return RestClient.builder()
                .baseUrl(properties.places().baseUrl())
                .requestFactory(fabricaComTimeout(timeoutSegundos))
                .build();
    }
}

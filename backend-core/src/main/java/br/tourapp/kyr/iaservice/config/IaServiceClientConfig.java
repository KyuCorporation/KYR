package br.tourapp.kyr.iaservice.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.time.Duration;

@Configuration
@EnableConfigurationProperties(IaServiceProperties.class)
public class IaServiceClientConfig {

    private static final Duration TIMEOUT_MAXIMO_DE_CONEXAO = Duration.ofSeconds(5);
    static final String CABECALHO_TOKEN = "X-Kyr-Token";

    @Bean
    RestClient iaServiceRestClient(IaServiceProperties properties) {
        Duration timeoutDeLeitura = Duration.ofSeconds(properties.timeoutSeconds());
        Duration timeoutDeConexao = timeoutDeLeitura.compareTo(TIMEOUT_MAXIMO_DE_CONEXAO) < 0
                ? timeoutDeLeitura
                : TIMEOUT_MAXIMO_DE_CONEXAO;

        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(timeoutDeConexao);
        requestFactory.setReadTimeout(timeoutDeLeitura);

        RestClient.Builder builder = RestClient.builder()
                .baseUrl(properties.baseUrl())
                .requestFactory(requestFactory);
        if (properties.token() != null && !properties.token().isBlank()) {
            builder.defaultHeader(CABECALHO_TOKEN, properties.token().strip());
        }
        return builder.build();
    }
}

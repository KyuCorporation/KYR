package br.tourapp.kyr.iaservice.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

@ConfigurationProperties(prefix = "ia-service")
public record IaServiceProperties(
        @DefaultValue("http://localhost:8000") String baseUrl,
        @DefaultValue("40") int timeoutSeconds) {
}

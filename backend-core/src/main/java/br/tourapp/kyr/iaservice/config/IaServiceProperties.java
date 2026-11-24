package br.tourapp.kyr.iaservice.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

// token: segredo compartilhado com o ia-service (IA_SERVICE_TOKEN), enviado em X-Kyr-Token. Vazio, nada é enviado.
@ConfigurationProperties(prefix = "ia-service")
public record IaServiceProperties(
        @DefaultValue("http://localhost:8000") String baseUrl,
        @DefaultValue("40") int timeoutSeconds,
        @DefaultValue("") String token) {

    @Override
    public String toString() {
        return "IaServiceProperties[baseUrl=" + baseUrl + ", timeoutSeconds=" + timeoutSeconds + ", token=***]";
    }
}

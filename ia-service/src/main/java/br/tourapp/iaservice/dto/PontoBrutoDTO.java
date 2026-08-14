package br.tourapp.iaservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;

// POI bruto, como recebido do backend-core. Ressalto que é um formato provisório, pois o contrato definitivo de /roteiros ainda não fechou (US-04).
// Ver em docs/openapi.yaml quando fechar.

public record PontoBrutoDTO(@NotBlank String nome, @NotBlank String categoria,
        @Size(min = 2, max = 2, message = "coordenadas deve ter exatamente [latitude, longitude]")
        List<Double> coordenadas
) {
}

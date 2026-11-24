package br.tourapp.iaservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;

// POI bruto, como recebido do backend-core: nome, categoria do Google e coordenadas [latitude, longitude].
public record PontoBrutoDTO(@NotBlank @Size(max = 300) String nome, @NotBlank @Size(max = 100) String categoria,
        @Size(min = 2, max = 2, message = "coordenadas deve ter exatamente [latitude, longitude]")
        List<Double> coordenadas
) {
}

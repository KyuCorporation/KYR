package br.tourapp.kyr.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record PontoDTO(
    @NotBlank(message = "nome é obrigatório") @Size(max = 300, message = "nome muito longo") String nome,
    @NotNull(message = "latitude é obrigatória")
    @DecimalMin(value = "-90", message = "latitude inválida") @DecimalMax(value = "90", message = "latitude inválida")
    Double latitude,
    @NotNull(message = "longitude é obrigatória")
    @DecimalMin(value = "-180", message = "longitude inválida") @DecimalMax(value = "180", message = "longitude inválida")
    Double longitude
) {}

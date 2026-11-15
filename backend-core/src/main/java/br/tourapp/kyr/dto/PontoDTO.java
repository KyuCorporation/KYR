package br.tourapp.kyr.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record PontoDTO(
    @NotBlank(message = "nome é obrigatório") String nome,
    @NotNull(message = "latitude é obrigatória") Double latitude,
    @NotNull(message = "longitude é obrigatória") Double longitude
) {}
package br.tourapp.kyr.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

public record RoteiroRequestDTO(
    @NotNull(message = "origem é obrigatória") @Valid PontoDTO origem,
    @NotNull(message = "destino é obrigatório") @Valid PontoDTO destino
) {}
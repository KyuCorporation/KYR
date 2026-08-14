package br.tourapp.iaservice.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.util.List;

// Payload de entrada de POST /curar-roteiro.

// Para ver um exemplo (ver docs/exemplo-request.md.

public record RoteiroRequestDTO(@NotNull @Valid List<PontoBrutoDTO> pontos) {
}

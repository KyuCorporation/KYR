package br.tourapp.iaservice.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

// Payload de entrada de POST /curar-roteiro (contrato em docs/openapi.yml).
// O backend-core manda no máximo 10 pontos por roteiro; o teto de 50 impede que um pedido enorme vire um
// prompt enorme (e uma conta enorme) no provedor de LLM.
public record RoteiroRequestDTO(
        @NotNull @Size(max = RoteiroRequestDTO.MAXIMO_DE_PONTOS, message = "no máximo 50 pontos por pedido")
        @Valid List<PontoBrutoDTO> pontos) {

    public static final int MAXIMO_DE_PONTOS = 50;
}

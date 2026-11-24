package br.tourapp.kyr.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record RoteiroRequestDTO(
    @NotNull(message = "origem é obrigatória") @Valid PontoDTO origem,
    @NotNull(message = "destino é obrigatório") @Valid PontoDTO destino,
    // Paradas escolhidas pela pessoa. Opcional. A busca de lugares segue a rota que passa por elas na ordem
    // informada; a ordem final de visita é otimizada pela Directions junto com os lugares sugeridos.
    @Size(max = 8, message = "um roteiro tem no máximo 8 paradas") List<@NotNull(message = "parada inválida") @Valid PontoDTO> paradas,
    // Meio de transporte. Opcional; sem ele, vale DRIVING.
    Transporte transporte
) {

    public RoteiroRequestDTO(PontoDTO origem, PontoDTO destino) {
        this(origem, destino, null, null);
    }

    public List<PontoDTO> paradasOuVazio() {
        return paradas == null ? List.of() : paradas;
    }

    public Transporte transporteOuPadrao() {
        return transporte == null ? Transporte.DRIVING : transporte;
    }
}

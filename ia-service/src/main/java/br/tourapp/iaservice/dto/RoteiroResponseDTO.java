package br.tourapp.iaservice.dto;

import java.util.List;

// Resposta de POST /curar-roteiro. lista de POIs, cada um individualmente curado ou em fallback. Se algum provedor da cadeia respondeu com sucesso

public record RoteiroResponseDTO(List<PontoCuradoDTO> pontos, boolean curadoPorIa, String modeloUtilizado) {
}

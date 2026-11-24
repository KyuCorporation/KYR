package br.tourapp.iaservice.dto;

import java.util.List;

// Resposta de POST /curar-roteiro: os POIs na ordem do pedido, cada um curado ou em fallback individual.
// curadoPorIa é true quando algum provedor da cadeia respondeu; modeloUtilizado é o modelo que respondeu.
public record RoteiroResponseDTO(List<PontoCuradoDTO> pontos, boolean curadoPorIa, String modeloUtilizado) {
}

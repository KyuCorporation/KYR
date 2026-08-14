package br.tourapp.iaservice.dto;

import java.util.List;

// POI depois da curadoria, ou do fallback individual, se este ponto específico não pôde ser curado.

public record PontoCuradoDTO(String nome, String categoria, List<Double> coordenadas, String trilha, String tipo, String descricao, boolean curado) {
}

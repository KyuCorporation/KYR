package br.tourapp.kyr.iaservice.client.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record PontoCuradoDto(String nome, String categoria, List<Double> coordenadas, String trilha, String tipo,
                             String descricao, boolean curado) {
}

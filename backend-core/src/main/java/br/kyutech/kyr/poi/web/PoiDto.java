package br.kyutech.kyr.poi.web;

import br.kyutech.kyr.poi.model.Coordenada;

public record PoiDto(String nome, Coordenada coordenadas, String categoria, Double nota) {
}

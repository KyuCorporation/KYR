package br.tourapp.kyr.poi.web;

import br.tourapp.kyr.poi.model.Coordenada;

public record PoiDto(String nome, Coordenada coordenadas, String categoria, Double nota) {
}

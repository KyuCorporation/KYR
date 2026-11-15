package br.tourapp.kyr.poi.web;

import br.tourapp.kyr.poi.model.Coordenada;

import java.util.List;

public record RotaResponseDto(List<PoiDto> pois, List<Coordenada> rota) {
}

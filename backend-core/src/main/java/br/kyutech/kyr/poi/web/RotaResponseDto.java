package br.kyutech.kyr.poi.web;

import br.kyutech.kyr.poi.model.Coordenada;

import java.util.List;

public record RotaResponseDto(List<PoiDto> pois, List<Coordenada> rota) {
}

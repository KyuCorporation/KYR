package br.tourapp.kyr.poi.model;

import java.util.List;

// POIs encontrados ao longo de uma rota, junto com a linha da rota decodificada.
public record PoisNaRota(List<PoiCandidato> candidatos, List<Coordenada> rota) {
}

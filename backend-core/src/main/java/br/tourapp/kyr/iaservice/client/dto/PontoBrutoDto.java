package br.tourapp.kyr.iaservice.client.dto;

import java.util.List;

// POI enviado ao ia-service: coordenadas no formato [latitude, longitude].
public record PontoBrutoDto(String nome, String categoria, List<Double> coordenadas) {
}

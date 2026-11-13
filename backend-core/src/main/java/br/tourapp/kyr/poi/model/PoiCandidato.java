package br.tourapp.kyr.poi.model;

// POI vindo do Places com os dados que o roteiro usa além do PoiDto público: endereço e link do lugar.
public record PoiCandidato(String nome, Coordenada coordenadas, String categoria, Double nota, String endereco, String linkMaps) {
}

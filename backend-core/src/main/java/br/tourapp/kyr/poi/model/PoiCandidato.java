package br.tourapp.kyr.poi.model;

// POI vindo do Places com os dados que o roteiro usa além do PoiDto público: endereço, link do lugar
// e total de avaliações (usado só para escolher os POIs, não vai na resposta).
public record PoiCandidato(String nome, Coordenada coordenadas, String categoria, Double nota, Integer totalAvaliacoes,
                           String endereco, String linkMaps) {

    public PoiCandidato(String nome, Coordenada coordenadas, String categoria, Double nota, String endereco, String linkMaps) {
        this(nome, coordenadas, categoria, nota, null, endereco, linkMaps);
    }
}

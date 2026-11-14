package br.tourapp.kyr.poi.model;

// POI vindo do Places com os dados que o roteiro usa além do PoiDto público: endereço, link do lugar,
// total de avaliações (usado só para escolher os POIs) e o ID do lugar no Google (usado no cache de curadoria).
public record PoiCandidato(String nome, Coordenada coordenadas, String categoria, Double nota, Integer totalAvaliacoes,
                           String endereco, String linkMaps, String placeId) {

    public PoiCandidato(String nome, Coordenada coordenadas, String categoria, Double nota, Integer totalAvaliacoes,
                        String endereco, String linkMaps) {
        this(nome, coordenadas, categoria, nota, totalAvaliacoes, endereco, linkMaps, null);
    }

    public PoiCandidato(String nome, Coordenada coordenadas, String categoria, Double nota, String endereco, String linkMaps) {
        this(nome, coordenadas, categoria, nota, null, endereco, linkMaps, null);
    }
}

package br.tourapp.kyr.dto;

public record MetadadosDTO(
    int totalPontos,
    long tempoRespostaMs,
    String fonteIA,
    boolean curadoPorIa,
    String fonteRota,
    // Meio de transporte usado nas distâncias e tempos (DRIVING, WALKING, BICYCLING ou TRANSIT).
    String transporte
) {

    public MetadadosDTO(int totalPontos, long tempoRespostaMs, String fonteIA, boolean curadoPorIa, String fonteRota) {
        this(totalPontos, tempoRespostaMs, fonteIA, curadoPorIa, fonteRota, Transporte.DRIVING.name());
    }
}

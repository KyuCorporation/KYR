package br.tourapp.kyr.dto;

public record MetadadosDTO(
    int totalPontos,
    long tempoRespostaMs,
    String fonteIA,
    boolean curadoPorIa,
    String fonteRota
) {}

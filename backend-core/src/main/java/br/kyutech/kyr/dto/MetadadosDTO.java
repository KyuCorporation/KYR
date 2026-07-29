package br.kyutech.kyr.dto;

public record MetadadosDTO(
    int totalPontos,
    long tempoRespostaMs,
    String fonteIA
) {}
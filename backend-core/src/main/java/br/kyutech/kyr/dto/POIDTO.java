package br.kyutech.kyr.dto;

public record POIDTO(
    String nome,
    String trilha,
    String tipo,
    String endereco,
    Double latitude,
    Double longitude,
    String fonte,
    String descricao
) {}
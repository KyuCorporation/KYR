package br.kyutech.kyr.dto;

import java.util.List;

public record RoteiroResponseDTO(
    List<POIDTO> pontos,
    MetadadosDTO metadados
) {}
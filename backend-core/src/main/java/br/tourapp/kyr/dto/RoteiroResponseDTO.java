package br.tourapp.kyr.dto;

import java.util.List;

public record RoteiroResponseDTO(
    List<POIDTO> pontos,
    MetadadosDTO metadados
) {}
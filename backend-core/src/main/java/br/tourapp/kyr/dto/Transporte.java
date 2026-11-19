package br.tourapp.kyr.dto;

import java.util.Locale;

// Meio de transporte do roteiro, com os mesmos nomes do modo de viagem da Directions API.
public enum Transporte {
    DRIVING,
    WALKING,
    BICYCLING,
    TRANSIT;

    // Valor do parâmetro "mode" da Directions API.
    public String modoDirections() {
        return name().toLowerCase(Locale.ROOT);
    }

    // A Directions não aceita pontos intermediários (waypoints) no modo transporte público.
    public boolean aceitaParadas() {
        return this != TRANSIT;
    }
}

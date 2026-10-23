package br.kyutech.kyr.poi.client.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)

public record PlaceLocationDto(double latitude, double longitude) {
}

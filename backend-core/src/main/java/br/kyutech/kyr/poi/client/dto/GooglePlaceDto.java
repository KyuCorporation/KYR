package br.kyutech.kyr.poi.client.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)

public record GooglePlaceDto(String id, DisplayNameDto displayName, PlaceLocationDto location, String primaryType, List<String> types, Double rating) {
}

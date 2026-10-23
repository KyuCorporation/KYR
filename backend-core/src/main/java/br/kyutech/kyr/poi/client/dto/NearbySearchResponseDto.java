package br.kyutech.kyr.poi.client.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)

public record NearbySearchResponseDto(List<GooglePlaceDto> places) {
}

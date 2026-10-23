package br.kyutech.kyr.poi.client.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record DirectionsResponseDto(String status, @JsonProperty("error_message") String errorMessage, List<DirectionsRouteDto> routes) {
}

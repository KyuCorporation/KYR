package br.tourapp.kyr.poi.client.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public record DirectionsStepDto(@JsonProperty("start_location") LatLngDto startLocation, @JsonProperty("end_location") LatLngDto endLocation) {
}

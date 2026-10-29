package br.tourapp.kyr.poi.client.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record DirectionsRouteDto(List<DirectionsLegDto> legs, @JsonProperty("overview_polyline") OverviewPolylineDto overviewPolyline) {
}

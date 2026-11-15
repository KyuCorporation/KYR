package br.tourapp.kyr.poi.client.dto;

import java.util.List;

public record NearbySearchRequestDto(LocationRestrictionDto locationRestriction, int maxResultCount, List<String> includedTypes) {
}

package br.kyutech.kyr.poi.client.dto;

public record NearbySearchRequestDto(LocationRestrictionDto locationRestriction, int maxResultCount) {
}

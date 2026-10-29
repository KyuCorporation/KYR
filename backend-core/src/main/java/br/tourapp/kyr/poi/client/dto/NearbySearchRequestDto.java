package br.tourapp.kyr.poi.client.dto;

public record NearbySearchRequestDto(LocationRestrictionDto locationRestriction, int maxResultCount) {
}

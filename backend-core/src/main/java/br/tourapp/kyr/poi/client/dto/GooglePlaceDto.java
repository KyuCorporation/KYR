package br.tourapp.kyr.poi.client.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)

public record GooglePlaceDto(String id, DisplayNameDto displayName, PlaceLocationDto location, String primaryType, List<String> types, Double rating, Integer userRatingCount, String formattedAddress, String googleMapsUri) {

    public GooglePlaceDto(String id, DisplayNameDto displayName, PlaceLocationDto location, String primaryType, List<String> types, Double rating, String formattedAddress, String googleMapsUri) {
        this(id, displayName, location, primaryType, types, rating, null, formattedAddress, googleMapsUri);
    }

    public GooglePlaceDto(String id, DisplayNameDto displayName, PlaceLocationDto location, String primaryType, List<String> types, Double rating) {
        this(id, displayName, location, primaryType, types, rating, null, null, null);
    }
}

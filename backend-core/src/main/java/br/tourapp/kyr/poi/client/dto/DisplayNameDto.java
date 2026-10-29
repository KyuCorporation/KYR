package br.tourapp.kyr.poi.client.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)

public record DisplayNameDto(String text, String languageCode) {
}

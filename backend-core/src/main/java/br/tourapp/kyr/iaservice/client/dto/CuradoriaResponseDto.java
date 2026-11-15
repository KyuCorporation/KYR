package br.tourapp.kyr.iaservice.client.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

// O ia-service responde em snake_case; o restante do backend-core continua em camelCase.
@JsonIgnoreProperties(ignoreUnknown = true)
public record CuradoriaResponseDto(
        List<PontoCuradoDto> pontos,
        @JsonProperty("curado_por_ia") boolean curadoPorIa,
        @JsonProperty("modelo_utilizado") String modeloUtilizado) {
}

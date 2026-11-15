package br.tourapp.kyr.poi.service;

import br.tourapp.kyr.poi.client.dto.GooglePlaceDto;
import br.tourapp.kyr.poi.model.Coordenada;
import br.tourapp.kyr.poi.model.PoiCandidato;
import br.tourapp.kyr.poi.web.PoiDto;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
public class PoiNormalizer {

    private static final String CATEGORIA_DESCONHECIDA = "desconhecida";
    private static final String NOME_DESCONHECIDO = "Local sem nome";

    public Optional<PoiDto> normalizar(GooglePlaceDto place) {
        return normalizarCandidato(place)
                .map(candidato -> new PoiDto(candidato.nome(), candidato.coordenadas(), candidato.categoria(), candidato.nota()));
    }

    public Optional<PoiCandidato> normalizarCandidato(GooglePlaceDto place) {
        if (place == null || place.location() == null) {
            return Optional.empty();
        }

        Coordenada coordenadas = new Coordenada(place.location().latitude(), place.location().longitude());
        return Optional.of(new PoiCandidato(extrairNome(place), coordenadas, extrairCategoria(place), place.rating(),
                place.userRatingCount(),
                textoOuNulo(place.formattedAddress()), textoOuNulo(place.googleMapsUri()), textoOuNulo(place.id())));
    }

    private String textoOuNulo(String valor) {
        return valor != null && !valor.isBlank() ? valor : null;
    }

    private String extrairNome(GooglePlaceDto place) {
        if (place.displayName() != null && place.displayName().text() != null && !place.displayName().text().isBlank()) {
            return place.displayName().text();
        }
        return NOME_DESCONHECIDO;
    }

    private String extrairCategoria(GooglePlaceDto place) {
        if (place.primaryType() != null && !place.primaryType().isBlank()) {
            return place.primaryType();
        }
        if (place.types() != null && !place.types().isEmpty()) {
            return place.types().get(0);
        }
        return CATEGORIA_DESCONHECIDA;
    }
}

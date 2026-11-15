package br.tourapp.kyr.poi.service;

import br.tourapp.kyr.poi.client.dto.DisplayNameDto;
import br.tourapp.kyr.poi.client.dto.GooglePlaceDto;
import br.tourapp.kyr.poi.client.dto.PlaceLocationDto;
import br.tourapp.kyr.poi.model.PoiCandidato;
import br.tourapp.kyr.poi.web.PoiDto;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

class PoiNormalizerCandidatoTest {

    private final PoiNormalizer normalizer = new PoiNormalizer();

    @Test
    void devePreencherEnderecoELinkDoLugarNoCandidato() {
        GooglePlaceDto place = new GooglePlaceDto(
                "id-1",
                new DisplayNameDto("Parque das Aves", "pt-BR"),
                new PlaceLocationDto(-25.6396, -54.4353),
                "tourist_attraction",
                List.of("tourist_attraction"),
                4.8,
                "Av. das Cataratas, 12450 - Foz do Iguaçu - PR",
                "https://maps.google.com/?cid=123");

        Optional<PoiCandidato> resultado = normalizer.normalizarCandidato(place);

        assertThat(resultado).isPresent();
        PoiCandidato candidato = resultado.get();
        assertThat(candidato.nome()).isEqualTo("Parque das Aves");
        assertThat(candidato.coordenadas().latitude()).isEqualTo(-25.6396);
        assertThat(candidato.coordenadas().longitude()).isEqualTo(-54.4353);
        assertThat(candidato.categoria()).isEqualTo("tourist_attraction");
        assertThat(candidato.nota()).isEqualTo(4.8);
        assertThat(candidato.endereco()).isEqualTo("Av. das Cataratas, 12450 - Foz do Iguaçu - PR");
        assertThat(candidato.linkMaps()).isEqualTo("https://maps.google.com/?cid=123");
    }

    @Test
    void deveDeixarEnderecoELinkNulosQuandoOPlacesNaoOsDevolve() {
        GooglePlaceDto place = new GooglePlaceDto(
                "id-2",
                new DisplayNameDto("Loja X", "pt-BR"),
                new PlaceLocationDto(-25.598, -54.486),
                "store",
                List.of("store"),
                null);

        Optional<PoiCandidato> resultado = normalizer.normalizarCandidato(place);

        assertThat(resultado).isPresent();
        assertThat(resultado.get().endereco()).isNull();
        assertThat(resultado.get().linkMaps()).isNull();
        assertThat(resultado.get().nota()).isNull();
    }

    @Test
    void deveRetornarVazioQuandoLocationAusente() {
        GooglePlaceDto placeSemLocation = new GooglePlaceDto("id-3", null, null, null, List.of(), null);

        assertThat(normalizer.normalizarCandidato(placeSemLocation)).isEmpty();
    }

    @Test
    void deveManterOPoiPublicoSemEnderecoNemLink() {
        GooglePlaceDto place = new GooglePlaceDto(
                "id-1",
                new DisplayNameDto("Parque das Aves", "pt-BR"),
                new PlaceLocationDto(-25.6396, -54.4353),
                "tourist_attraction",
                List.of("tourist_attraction"),
                4.8,
                "Av. das Cataratas, 12450 - Foz do Iguaçu - PR",
                "https://maps.google.com/?cid=123");

        Optional<PoiDto> resultado = normalizer.normalizar(place);

        assertThat(resultado).contains(new PoiDto("Parque das Aves",
                new br.tourapp.kyr.poi.model.Coordenada(-25.6396, -54.4353), "tourist_attraction", 4.8));
    }
}

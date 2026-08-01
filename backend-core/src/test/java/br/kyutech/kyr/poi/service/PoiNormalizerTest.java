package br.tourapp.kyr.poi.service;

import br.tourapp.kyr.poi.client.dto.GooglePlaceDto;
import br.tourapp.kyr.poi.client.dto.NearbySearchResponseDto;
import br.tourapp.kyr.poi.web.PoiDto;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

class PoiNormalizerTest {

    private final PoiNormalizer normalizer = new PoiNormalizer();
    private List<GooglePlaceDto> placesDaFixture;

    @BeforeEach
    void carregarFixture() throws IOException {
        ObjectMapper mapper = new ObjectMapper();
        try (InputStream fixture = getClass().getResourceAsStream("/fixtures/places-nearby-response.json")) {
            NearbySearchResponseDto resposta = mapper.readValue(fixture, NearbySearchResponseDto.class);
            placesDaFixture = resposta.places();
        }
    }

    @Test
    void deveNormalizarPlaceCompletoComNota() {
        GooglePlaceDto place = placesDaFixture.get(0);

        Optional<PoiDto> resultado = normalizer.normalizar(place);

        assertThat(resultado).isPresent();
        PoiDto poi = resultado.get();
        assertThat(poi.nome()).isEqualTo("Parque Nacional do Iguaçu - Centro de Visitantes");
        assertThat(poi.coordenadas().latitude()).isEqualTo(-25.6953);
        assertThat(poi.coordenadas().longitude()).isEqualTo(-54.4367);
        assertThat(poi.categoria()).isEqualTo("tourist_attraction");
        assertThat(poi.nota()).isEqualTo(4.8);
    }

    @Test
    void deveNormalizarPlaceSemNotaComoNotaNula() {
        GooglePlaceDto place = placesDaFixture.get(1);

        Optional<PoiDto> resultado = normalizer.normalizar(place);

        assertThat(resultado).isPresent();
        assertThat(resultado.get().nota()).isNull();
        assertThat(resultado.get().nome()).isEqualTo("Cantina da Bea");
        assertThat(resultado.get().categoria()).isEqualTo("restaurant");
    }

    @Test
    void deveUsarPrimeiroTipoQuandoPrimaryTypeAusente() {
        GooglePlaceDto place = placesDaFixture.get(2);

        Optional<PoiDto> resultado = normalizer.normalizar(place);

        assertThat(resultado).isPresent();
        assertThat(resultado.get().categoria()).isEqualTo("store");
    }

    @Test
    void deveRetornarVazioQuandoLocationAusente() {
        GooglePlaceDto placeSemLocation = new GooglePlaceDto(
                "id-sem-location", null, null, null, List.of(), null);

        Optional<PoiDto> resultado = normalizer.normalizar(placeSemLocation);

        assertThat(resultado).isEmpty();
    }
}

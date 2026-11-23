package br.tourapp.kyr.service;

import br.tourapp.kyr.PostgresDeTeste;
import br.tourapp.kyr.service.CuradoriaCache.Curada;
import org.junit.jupiter.api.Test;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

// Cache de curadoria contra o Postgres real: leitura por ID, atualização e prazo de validade.
@Testcontainers(disabledWithoutDocker = true)
class JdbcCuradoriaCachePostgresTest extends PostgresDeTeste {

    private static final Curada PARQUE = new Curada("turismo", "lazer", "Aves da Mata Atlântica.", "gemini-3.5-flash-lite");
    private static final Curada CAFE = new Curada("turismo", "alimentacao", "Café no centro.", "ollama-mistral");

    private void envelhecer(String placeId, int dias) {
        jdbc.sql("update curadoria_poi set curado_em = now() - make_interval(days => :dias) where place_id = :id")
                .param("dias", dias)
                .param("id", placeId)
                .update();
    }

    @Test
    void devolveSoOsLugaresJaCurados() {
        JdbcCuradoriaCache cache = new JdbcCuradoriaCache(jdbc, 30);
        cache.salvar(Map.of("place-parque", PARQUE, "place-cafe", CAFE));

        Map<String, Curada> lidas = cache.buscar(Arrays.asList("place-parque", "place-novo", null, "place-parque"));

        assertThat(lidas).containsOnly(Map.entry("place-parque", PARQUE));
    }

    @Test
    void listaVaziaNaoConsultaNada() {
        assertThat(new JdbcCuradoriaCache(jdbc, 30).buscar(List.of())).isEmpty();
        assertThat(new JdbcCuradoriaCache(jdbc, 30).buscar(Arrays.asList(null, null))).isEmpty();
    }

    @Test
    void salvarDeNovoSubstituiERenovaOPrazo() {
        JdbcCuradoriaCache cache = new JdbcCuradoriaCache(jdbc, 30);
        cache.salvar(Map.of("place-parque", PARQUE));
        envelhecer("place-parque", 40);

        Curada nova = new Curada("turismo", "lazer", "Descrição nova.", "gemini-3.5-flash-lite");
        cache.salvar(Map.of("place-parque", nova));

        assertThat(cache.buscar(List.of("place-parque"))).containsEntry("place-parque", nova);
        assertThat(jdbc.sql("select count(*) from curadoria_poi").query(Integer.class).single()).isEqualTo(1);
    }

    @Test
    void curadoriaVencidaVoltaParaAIa() {
        new JdbcCuradoriaCache(jdbc, 30).salvar(Map.of("place-parque", PARQUE));
        envelhecer("place-parque", 31);

        assertThat(new JdbcCuradoriaCache(jdbc, 30).buscar(List.of("place-parque"))).isEmpty();
        assertThat(new JdbcCuradoriaCache(jdbc, 60).buscar(List.of("place-parque"))).containsKey("place-parque");
    }
}

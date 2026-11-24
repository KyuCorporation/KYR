package br.tourapp.kyr.conta;

import br.tourapp.kyr.PostgresDeTeste;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

// Os termos da Places API só permitem guardar coordenadas por 30 dias. Esta limpeza é o que garante isso.
@Testcontainers(disabledWithoutDocker = true)
class LimpezaDeCoordenadasPostgresTest extends PostgresDeTeste {

    private long usuarioId;

    @BeforeEach
    void criarConta() {
        cadastrar(new ContaService(jdbc), "Ana", "ana@exemplo.com");
        usuarioId = jdbc.sql("select id from usuario").query(Long.class).single();
    }

    private long roteiroCriadoHa(int dias) {
        return jdbc.sql("""
                        insert into roteiro_salvo (usuario_id, origem_nome, origem_latitude, origem_longitude,
                                                   destino_nome, destino_latitude, destino_longitude, criado_em)
                        values (:usuario, 'Aeroporto', -25.59, -54.49, 'Centro', -25.54, -54.58,
                                now() - make_interval(days => :dias))
                        returning id
                        """)
                .param("usuario", usuarioId)
                .param("dias", dias)
                .query(Long.class)
                .single();
    }

    private Map<String, Object> roteiro(long id) {
        return jdbc.sql("select * from roteiro_salvo where id = :id").param("id", id).query().singleRow();
    }

    @Test
    void apagaCoordenadasENomesDosRoteirosComMaisDe30Dias() {
        long antigo = roteiroCriadoHa(31);
        long recente = roteiroCriadoHa(29);

        new LimpezaDeCoordenadas(jdbc).apagarCoordenadasVencidas();

        // O nome da origem e do destino costuma vir das sugestões do Google: some junto com as coordenadas.
        Map<String, Object> vencido = roteiro(antigo);
        assertThat(vencido).containsEntry("origem_latitude", null).containsEntry("origem_longitude", null)
                .containsEntry("destino_latitude", null).containsEntry("destino_longitude", null)
                .containsEntry("origem_nome", "").containsEntry("destino_nome", "");
        assertThat(roteiro(recente).get("origem_latitude")).isNotNull();
        assertThat(roteiro(recente).get("destino_longitude")).isNotNull();
        assertThat(roteiro(recente)).containsEntry("origem_nome", "Aeroporto").containsEntry("destino_nome", "Centro");
    }

    @Test
    void rodarDeNovoNaoAlteraNada() {
        long antigo = roteiroCriadoHa(40);
        LimpezaDeCoordenadas limpeza = new LimpezaDeCoordenadas(jdbc);

        limpeza.apagarCoordenadasVencidas();
        Map<String, Object> depoisDaPrimeira = roteiro(antigo);
        limpeza.apagarCoordenadasVencidas();

        assertThat(roteiro(antigo)).isEqualTo(depoisDaPrimeira);
    }

    @Test
    void falhaNoBancoNaoDerrubaAAplicacao() {
        JdbcClient quebrado = mock(JdbcClient.class);
        when(quebrado.sql(anyString())).thenThrow(new IllegalStateException("banco fora do ar"));

        assertThatCode(() -> new LimpezaDeCoordenadas(quebrado).apagarCoordenadasVencidas()).doesNotThrowAnyException();
    }
}

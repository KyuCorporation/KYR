package br.tourapp.kyr.conta;

import br.tourapp.kyr.conta.LimiteDeTentativas.Regra;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class LimiteDeTentativasTest {

    // Relógio que o teste avança à mão.
    private static final class RelogioDeTeste extends Clock {
        private Instant agora = Instant.parse("2026-11-21T12:00:00Z");

        void avancar(Duration duracao) {
            agora = agora.plus(duracao);
        }

        @Override
        public Instant instant() {
            return agora;
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }
    }

    private final RelogioDeTeste relogio = new RelogioDeTeste();
    private final LimiteDeTentativas limites = new LimiteDeTentativas(relogio);

    private void consumirVezes(Regra regra, String chave, int vezes) {
        for (int i = 0; i < vezes; i++) {
            limites.consumir(regra, chave);
        }
    }

    @Test
    void recusaDepoisDoMaximoComOTempoQueFaltaParaAJanelaAcabar() {
        consumirVezes(Regra.LOGIN_POR_EMAIL, "ana@exemplo.com", 5);
        relogio.avancar(Duration.ofMinutes(4));

        assertThatThrownBy(() -> limites.consumir(Regra.LOGIN_POR_EMAIL, "ana@exemplo.com"))
                .isInstanceOfSatisfying(MuitasTentativasException.class, e -> {
                    assertThat(e.segundosDeEspera()).isEqualTo(11 * 60);
                    assertThat(e.getMessage()).isEqualTo("Muitas tentativas. Tente de novo em 11 minutos.");
                    assertThat(e.codigo()).isEqualTo("muitas_tentativas");
                });
    }

    @Test
    void tentativaRecusadaNaoEstendeOBloqueio() {
        consumirVezes(Regra.LOGIN_POR_EMAIL, "ana@exemplo.com", 5);
        for (int i = 0; i < 10; i++) {
            assertThatThrownBy(() -> limites.consumir(Regra.LOGIN_POR_EMAIL, "ana@exemplo.com"))
                    .isInstanceOf(MuitasTentativasException.class);
        }

        relogio.avancar(Duration.ofMinutes(15));

        assertThatCode(() -> limites.consumir(Regra.LOGIN_POR_EMAIL, "ana@exemplo.com")).doesNotThrowAnyException();
    }

    @Test
    void chavesERegrasSaoIndependentes() {
        consumirVezes(Regra.LOGIN_POR_EMAIL, "ana@exemplo.com", 5);

        assertThatCode(() -> {
            limites.consumir(Regra.LOGIN_POR_EMAIL, "bruno@exemplo.com");
            limites.consumir(Regra.LOGIN_POR_IP, "ana@exemplo.com");
        }).doesNotThrowAnyException();
    }

    @Test
    void devolverDescontaUmaTentativaEEsquecerZera() {
        consumirVezes(Regra.LOGIN_POR_EMAIL, "ana@exemplo.com", 5);
        limites.devolver(Regra.LOGIN_POR_EMAIL, "ana@exemplo.com");
        limites.consumir(Regra.LOGIN_POR_EMAIL, "ana@exemplo.com");
        assertThatThrownBy(() -> limites.consumir(Regra.LOGIN_POR_EMAIL, "ana@exemplo.com"))
                .isInstanceOf(MuitasTentativasException.class);

        limites.esquecer(Regra.LOGIN_POR_EMAIL, "ana@exemplo.com");

        assertThatCode(() -> consumirVezes(Regra.LOGIN_POR_EMAIL, "ana@exemplo.com", 5)).doesNotThrowAnyException();
    }

    @Test
    void cadastroTemJanelaDeUmaHora() {
        consumirVezes(Regra.CADASTRO_POR_IP, "203.0.113.7", 10);
        relogio.avancar(Duration.ofMinutes(59));
        assertThatThrownBy(() -> limites.consumir(Regra.CADASTRO_POR_IP, "203.0.113.7"))
                .isInstanceOf(MuitasTentativasException.class)
                .hasMessage("Muitas tentativas. Tente de novo em 1 minuto.");

        relogio.avancar(Duration.ofMinutes(1));
        assertThatCode(() -> limites.consumir(Regra.CADASTRO_POR_IP, "203.0.113.7")).doesNotThrowAnyException();
    }

    @Test
    void limpezaDescartaSoAsJanelasVencidas() {
        limites.consumir(Regra.LOGIN_POR_EMAIL, "antigo@exemplo.com");
        relogio.avancar(Duration.ofMinutes(10));
        limites.consumir(Regra.LOGIN_POR_EMAIL, "recente@exemplo.com");
        limites.consumir(Regra.CADASTRO_POR_IP, "203.0.113.7");
        relogio.avancar(Duration.ofMinutes(6));

        limites.descartarVencidas();

        assertThat(limites.quantidadeDeChaves()).isEqualTo(2);
    }
}

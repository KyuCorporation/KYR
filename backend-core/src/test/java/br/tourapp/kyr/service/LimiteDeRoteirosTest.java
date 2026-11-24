package br.tourapp.kyr.service;

import br.tourapp.kyr.conta.IpDoCliente;
import br.tourapp.kyr.conta.LimiteDeTentativas;
import br.tourapp.kyr.conta.MuitasTentativasException;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class LimiteDeRoteirosTest {

    private final LimiteDeTentativas limites = new LimiteDeTentativas();
    private final IpDoCliente ipDoCliente = new IpDoCliente(0, "");

    private static MockHttpServletRequest de(String ip) {
        MockHttpServletRequest requisicao = new MockHttpServletRequest();
        requisicao.setRemoteAddr(ip);
        return requisicao;
    }

    @Test
    void limitaOsRoteirosDeUmMesmoIpPorHora() {
        LimiteDeRoteiros limite = new LimiteDeRoteiros(limites, ipDoCliente, 3, 0);
        for (int i = 0; i < 3; i++) {
            limite.consumir(de("203.0.113.7"));
        }

        assertThatThrownBy(() -> limite.consumir(de("203.0.113.7")))
                .isInstanceOf(MuitasTentativasException.class)
                .hasMessage("Muitos roteiros pedidos em pouco tempo. Tente de novo em 60 minutos.");
        assertThatCode(() -> limite.consumir(de("198.51.100.1"))).doesNotThrowAnyException();
    }

    @Test
    void oTetoDiarioValeParaTodosOsIpsENaoGastaOLimiteDoIp() {
        LimiteDeRoteiros limite = new LimiteDeRoteiros(limites, ipDoCliente, 2, 3);
        limite.consumir(de("203.0.113.1"));
        limite.consumir(de("203.0.113.2"));
        limite.consumir(de("203.0.113.3"));

        assertThatThrownBy(() -> limite.consumir(de("203.0.113.4")))
                .isInstanceOf(MuitasTentativasException.class)
                .satisfies(e -> {
                    assertThat(e.getMessage()).startsWith("O limite diário de roteiros do Kyr foi atingido. Tente de novo em ");
                    assertThat(((MuitasTentativasException) e).segundosDeEspera()).isGreaterThan(23 * 3600);
                });

        // O pedido recusado pelo teto diário não contou para o IP: com o teto desligado, ele ainda tem dois.
        LimiteDeRoteiros semTetoDiario = new LimiteDeRoteiros(limites, ipDoCliente, 2, 0);
        semTetoDiario.consumir(de("203.0.113.4"));
        semTetoDiario.consumir(de("203.0.113.4"));
        assertThatThrownBy(() -> semTetoDiario.consumir(de("203.0.113.4"))).isInstanceOf(MuitasTentativasException.class);
    }

    @Test
    void zeroDesligaOsLimites() {
        LimiteDeRoteiros limite = new LimiteDeRoteiros(limites, ipDoCliente, 0, 0);

        assertThatCode(() -> {
            for (int i = 0; i < 100; i++) {
                limite.consumir(de("203.0.113.7"));
            }
        }).doesNotThrowAnyException();
    }
}

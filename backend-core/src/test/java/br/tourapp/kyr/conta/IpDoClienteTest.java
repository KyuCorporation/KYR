package br.tourapp.kyr.conta;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.assertj.core.api.Assertions.assertThat;

class IpDoClienteTest {

    private static MockHttpServletRequest requisicao(String conexao, String encaminhado) {
        MockHttpServletRequest requisicao = new MockHttpServletRequest();
        requisicao.setRemoteAddr(conexao);
        if (encaminhado != null) {
            requisicao.addHeader("X-Forwarded-For", encaminhado);
        }
        return requisicao;
    }

    @Test
    void semProxyConfiavelIgnoraOXForwardedForQueOClientePodeInventar() {
        IpDoCliente ip = new IpDoCliente(0, "");

        assertThat(ip.de(requisicao("198.51.100.20", "10.0.0.1"))).isEqualTo("198.51.100.20");
        assertThat(ip.de(requisicao("198.51.100.20", null))).isEqualTo("198.51.100.20");
    }

    @Test
    void comProxiesConfiaveisUsaOEnderecoAnotadoPeloMaisDistante() {
        // O cliente mandou "1.1.1.1"; o proxy anotou o endereço real dele no fim.
        assertThat(new IpDoCliente(1, "").de(requisicao("10.0.0.2", "1.1.1.1, 203.0.113.7"))).isEqualTo("203.0.113.7");
        // Dois proxies: o segundo anota o endereço do primeiro, que não interessa.
        assertThat(new IpDoCliente(2, "").de(requisicao("10.0.0.2", "1.1.1.1, 203.0.113.7, 10.0.0.9"))).isEqualTo("203.0.113.7");
        // Lista mais curta que o número de proxies: fica com o primeiro endereço.
        assertThat(new IpDoCliente(2, "").de(requisicao("10.0.0.2", "203.0.113.7"))).isEqualTo("203.0.113.7");
    }

    @Test
    void aceitaOIpInformadoPeloFrontendSoComOSegredoCerto() {
        IpDoCliente ip = new IpDoCliente(1, "segredo-do-next");

        MockHttpServletRequest certo = requisicao("10.0.0.2", "10.0.0.3");
        certo.addHeader("X-Kyr-Client-Ip", "203.0.113.50");
        certo.addHeader("X-Kyr-Proxy-Token", "segredo-do-next");
        assertThat(ip.de(certo)).isEqualTo("203.0.113.50");

        MockHttpServletRequest errado = requisicao("10.0.0.2", "10.0.0.3");
        errado.addHeader("X-Kyr-Client-Ip", "203.0.113.50");
        errado.addHeader("X-Kyr-Proxy-Token", "chute");
        assertThat(ip.de(errado)).isEqualTo("10.0.0.3");
    }

    @Test
    void semSegredoConfiguradoOCabecalhoDoFrontendEIgnorado() {
        MockHttpServletRequest requisicao = requisicao("198.51.100.20", null);
        requisicao.addHeader("X-Kyr-Client-Ip", "203.0.113.50");
        requisicao.addHeader("X-Kyr-Proxy-Token", "");

        assertThat(new IpDoCliente(0, "").de(requisicao)).isEqualTo("198.51.100.20");
    }
}

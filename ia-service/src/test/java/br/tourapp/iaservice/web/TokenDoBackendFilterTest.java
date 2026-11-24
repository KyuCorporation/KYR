package br.tourapp.iaservice.web;

import jakarta.servlet.ServletException;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.io.IOException;

import static org.assertj.core.api.Assertions.assertThat;

class TokenDoBackendFilterTest {

    private static MockHttpServletResponse filtrar(TokenDoBackendFilter filtro, String caminho, String token)
            throws ServletException, IOException {
        MockHttpServletRequest requisicao = new MockHttpServletRequest("POST", caminho);
        if (token != null) {
            requisicao.addHeader("X-Kyr-Token", token);
        }
        MockHttpServletResponse resposta = new MockHttpServletResponse();
        filtro.doFilter(requisicao, resposta, new MockFilterChain());
        return resposta;
    }

    @Test
    void comTokenConfiguradoRecusaPedidoSemOTokenCerto() throws Exception {
        TokenDoBackendFilter filtro = new TokenDoBackendFilter("segredo");

        assertThat(filtrar(filtro, "/curar-roteiro", null).getStatus()).isEqualTo(401);
        assertThat(filtrar(filtro, "/curar-roteiro", "chute").getStatus()).isEqualTo(401);
        assertThat(filtrar(filtro, "/curar-roteiro", "chute").getContentAsString()).contains("nao_autorizado");
        assertThat(filtrar(filtro, "/curar-roteiro", "segredo").getStatus()).isEqualTo(200);
    }

    @Test
    void healthCheckContinuaAberto() throws Exception {
        TokenDoBackendFilter filtro = new TokenDoBackendFilter("segredo");

        assertThat(filtrar(filtro, "/actuator/health", null).getStatus()).isEqualTo(200);
    }

    @Test
    void semTokenConfiguradoTudoPassa() throws Exception {
        assertThat(filtrar(new TokenDoBackendFilter(""), "/curar-roteiro", null).getStatus()).isEqualTo(200);
    }
}

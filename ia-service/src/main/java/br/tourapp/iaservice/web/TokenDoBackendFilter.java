package br.tourapp.iaservice.web;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

// O /curar-roteiro chama provedores de LLM pagos. Quando IA_SERVICE_TOKEN está definido, só aceita pedidos
// com o mesmo segredo em X-Kyr-Token, que o backend-core envia. O health-check continua aberto.
// Sem o segredo configurado, tudo passa: serve para desenvolvimento local, não para um serviço público.
@Component
public class TokenDoBackendFilter extends OncePerRequestFilter {

    static final String CABECALHO = "X-Kyr-Token";

    private final byte[] token;

    public TokenDoBackendFilter(@Value("${kyu.seguranca.token-do-backend:}") String token) {
        this.token = token == null ? new byte[0] : token.strip().getBytes(StandardCharsets.UTF_8);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return token.length == 0 || !request.getRequestURI().startsWith("/curar-roteiro");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String recebido = request.getHeader(CABECALHO);
        boolean confere = recebido != null
                && MessageDigest.isEqual(recebido.strip().getBytes(StandardCharsets.UTF_8), token);
        if (!confere) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setCharacterEncoding(StandardCharsets.UTF_8.name());
            response.getWriter().write("{\"codigo\":\"nao_autorizado\",\"mensagem\":\"Token do backend ausente ou inválido.\"}");
            return;
        }
        chain.doFilter(request, response);
    }
}

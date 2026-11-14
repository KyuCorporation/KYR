package br.tourapp.kyr.conta;

import org.springframework.http.HttpStatus;

// Erro de regra das rotas de conta, roteiros salvos e avaliações. Vira { codigo, mensagem } na resposta.
public class ContaException extends RuntimeException {

    private final HttpStatus status;
    private final String codigo;

    public ContaException(HttpStatus status, String codigo, String mensagem) {
        super(mensagem);
        this.status = status;
        this.codigo = codigo;
    }

    public HttpStatus status() {
        return status;
    }

    public String codigo() {
        return codigo;
    }

    public static ContaException naoAutenticado() {
        return new ContaException(HttpStatus.UNAUTHORIZED, "nao_autenticado", "Entre na sua conta para continuar.");
    }
}

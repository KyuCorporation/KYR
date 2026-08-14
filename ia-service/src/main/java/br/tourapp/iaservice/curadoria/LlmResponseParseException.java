package br.tourapp.iaservice.curadoria;

// Levantada quando não é possível extrair um JSON válido da resposta de um LLM.

public class LlmResponseParseException extends RuntimeException {
    private static final int TAMANHO_MAXIMO_TRECHO = 300;

    public LlmResponseParseException(String motivo, String respostaBruta) {
        super(motivo + " | trecho da resposta: " + trecho(respostaBruta));
    }

    private static String trecho(String respostaBruta) {
        if (respostaBruta == null) {
            return "\"\"";
        }
        String semQuebras = respostaBruta.strip().replace("\n", " ");
        if (semQuebras.length() > TAMANHO_MAXIMO_TRECHO) {
            semQuebras = semQuebras.substring(0, TAMANHO_MAXIMO_TRECHO);
        }
        return "\"" + semQuebras + "\"";
    }
}

package br.tourapp.iaservice.curadoria;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import org.junit.jupiter.api.Test;

class LlmResponseParserTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void jsonDiretoELimpo() {
        String texto = """
                {"pontos": [{"nome": "X", "trilha": "turismo", "tipo": "lazer", "descricao": "abc"}]}
                """;

        Map<String, Object> resultado = LlmResponseParser.extrairJson(texto, objectMapper);

        assertThat(nomeDoPrimeiroPonto(resultado)).isEqualTo("X");
    }

    @Test
    void jsonDentroDeBlocoMarkdown() {
        String texto = """
                Aqui está o resultado da curadoria:

                ```json
                {"pontos": [{"nome": "Y", "trilha": "compras", "tipo": "alimentacao", "descricao": "def"}]}
                ```

                Espero que ajude!
                """;

        Map<String, Object> resultado = LlmResponseParser.extrairJson(texto, objectMapper);

        assertThat(nomeDoPrimeiroPonto(resultado)).isEqualTo("Y");
    }

    @Test
    void jsonComProsaAoRedorSemMarkdown() {
        String texto = "Segue o JSON solicitado: {\"pontos\": [{\"nome\": \"Z\"}]} — qualquer dúvida me avise.";

        Map<String, Object> resultado = LlmResponseParser.extrairJson(texto, objectMapper);

        assertThat(nomeDoPrimeiroPonto(resultado)).isEqualTo("Z");
    }

    @Test
    void jsonMalformadoLevantaErroTratavelEmVezDeCrashar() {
        String texto = "{\"pontos\": [{\"nome\": \"incompleto\""; // nunca fecha

        assertThatThrownBy(() -> LlmResponseParser.extrairJson(texto, objectMapper))
                .isInstanceOf(LlmResponseParseException.class);
    }

    @Test
    void respostaVaziaLevantaErroTratavel() {
        assertThatThrownBy(() -> LlmResponseParser.extrairJson("", objectMapper))
                .isInstanceOf(LlmResponseParseException.class);

        assertThatThrownBy(() -> LlmResponseParser.extrairJson("   ", objectMapper))
                .isInstanceOf(LlmResponseParseException.class);
    }

    @Test
    void textoSemNenhumJsonLevantaErroTratavel() {
        assertThatThrownBy(() -> LlmResponseParser.extrairJson("desculpe, não consigo ajudar com isso.", objectMapper))
                .isInstanceOf(LlmResponseParseException.class);
    }

    @SuppressWarnings("unchecked")
    private static String nomeDoPrimeiroPonto(Map<String, Object> resultado) {
        var pontos = (Iterable<Map<String, Object>>) resultado.get("pontos");
        return pontos.iterator().next().get("nome").toString();
    }
}

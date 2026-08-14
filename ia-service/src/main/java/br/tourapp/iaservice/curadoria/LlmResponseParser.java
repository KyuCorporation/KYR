package br.tourapp.iaservice.curadoria;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

// O LLM às vezes devolve o JSON envolto em texto explicativo ou em blocos de código MD. Esta classe tenta extrair o objeto JSON em três estratégias, na ordem:
// 1. JSON direto (a resposta inteira já é um JSON válido);
// 2. bloco json sem a tag);
// 3. o maior bloco bem-balanceado dentro do texto, ignorando chaves/colchetes que apareçam dentro de strings.

// Se nenhuma estratégia funcionar, levanta LlmResponseParseException.

public final class LlmResponseParser {

    private static final Pattern CODE_FENCE =
            Pattern.compile("```(?:json)?\\s*(.*?)\\s*```", Pattern.DOTALL | Pattern.CASE_INSENSITIVE);

    private static final TypeReference<Map<String, Object>> MAPA_JSON = new TypeReference<>() {
    };

    private LlmResponseParser() {
    }

    public static Map<String, Object> extrairJson(String respostaBruta, ObjectMapper objectMapper) {
        if (respostaBruta == null || respostaBruta.isBlank()) {
            throw new LlmResponseParseException("resposta vazia do LLM", respostaBruta);
        }

        Map<String, Object> direto = tentarJsonDireto(objectMapper, respostaBruta);
        if (direto != null) {
            return direto;
        }

        Map<String, Object> doBlocoMarkdown = tentarBlocoMarkdown(objectMapper, respostaBruta);
        if (doBlocoMarkdown != null) {
            return doBlocoMarkdown;
        }

        Map<String, Object> doBlocoBalanceado = tentarBlocoBalanceado(objectMapper, respostaBruta);
        if (doBlocoBalanceado != null) {
            return doBlocoBalanceado;
        }

        throw new LlmResponseParseException("não foi possível localizar um JSON válido na resposta do LLM", respostaBruta);
    }

    private static Map<String, Object> tentarJsonDireto(ObjectMapper objectMapper, String texto) {
        try {
            return objectMapper.readValue(texto, MAPA_JSON);
        } catch (Exception e) {
            return null;
        }
    }

    private static Map<String, Object> tentarBlocoMarkdown(ObjectMapper objectMapper, String texto) {
        Matcher matcher = CODE_FENCE.matcher(texto);
        if (!matcher.find()) {
            return null;
        }
        return tentarJsonDireto(objectMapper, matcher.group(1));
    }

    private static Map<String, Object> tentarBlocoBalanceado(ObjectMapper objectMapper, String texto) {
        String bloco = extrairBloco(texto, '{', '}');
        if (bloco == null) {
            bloco = extrairBloco(texto, '[', ']');
        }
        return bloco == null ? null : tentarJsonDireto(objectMapper, bloco);
    }

    private static String extrairBloco(String texto, char abre, char fecha) {
        int inicio = texto.indexOf(abre);
        if (inicio == -1) {
            return null;
        }

        int profundidade = 0;
        boolean dentroDeString = false;
        boolean escapando = false;

        for (int i = inicio; i < texto.length(); i++) {
            char c = texto.charAt(i);

            if (dentroDeString) {
                if (escapando) {
                    escapando = false;
                } else if (c == '\\') {
                    escapando = true;
                } else if (c == '"') {
                    dentroDeString = false;
                }
                continue;
            }

            if (c == '"') {
                dentroDeString = true;
            } else if (c == abre) {
                profundidade++;
            } else if (c == fecha) {
                profundidade--;
                if (profundidade == 0) {
                    return texto.substring(inicio, i + 1);
                }
            }
        }

        return null;
    }
}

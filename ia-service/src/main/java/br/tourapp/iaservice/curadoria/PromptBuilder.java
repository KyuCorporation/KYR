package br.tourapp.iaservice.curadoria;

import br.tourapp.iaservice.dto.PontoBrutoDTO;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;

// Monta o prompt de curadoria enviado ao LLM. O formato de saída exigido do modelo é fixado aqui como um JSON estrito. O parser ainda é tolerante a desvios, mas pedir o formato certo reduz a chance de precisar do fallback do parser.

public final class PromptBuilder {

    private PromptBuilder() {
    }

    public static String montarPrompt(List<PontoBrutoDTO> pontos, ObjectMapper objectMapper, int maxDescricaoChars) {
        String pontosJson;
        try {
            pontosJson = objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(pontos);
        } catch (JsonProcessingException e) {
            // Não deveria acontecer pois pontos já passaram pela validação do controller. Se acontecer, é bug nosso. Validar.
            throw new IllegalStateException("Falha ao serializar POIs para o prompt de curadoria", e);
        }

        return """
                Você é o serviço de curadoria de roteiros turísticos do protótipo KYU. \
                Você recebe pontos de interesse (POIs) brutos, obtidos via Google Maps, ao longo do trajeto que um turista \
                escolheu entre uma origem e um destino. Use só o nome, a categoria e as coordenadas de cada POI; \
                não presuma a cidade nem o motivo da viagem. \

                Para cada POI da lista abaixo, classifique em:
                - "trilha": exatamente "turismo" ou "compras"
                - "tipo": exatamente "alimentacao" ou "lazer"
                - "descricao": 1 a 2 frases em português, tom neutro e informativo, destacando o \
                que torna o local relevante para um turista de passagem pela cidade. \
                LIMITE RÍGIDO: no máximo %d caracteres, incluindo espaços e pontuação. \
                Esse limite é combinado com o frontend, que corta o texto visualmente se for ultrapassado — \
                prefira uma frase mais curta e completa a uma frase truncada no meio.

                Responda SOMENTE com um JSON no formato abaixo. Sem texto antes ou depois, sem \
                marcação markdown, sem comentários:

                {
                  "pontos": [
                    {"nome": "<mesmo nome recebido, sem alterar>", "trilha": "turismo", "tipo": "lazer", "descricao": "..."}
                  ]
                }

                POIs para curadoria:
                """.formatted(maxDescricaoChars) + pontosJson;
    }
}
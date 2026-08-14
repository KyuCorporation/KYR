package br.tourapp.iaservice.curadoria;

import br.tourapp.iaservice.config.FallbackChainProperties;
import br.tourapp.iaservice.dto.PontoBrutoDTO;
import br.tourapp.iaservice.dto.PontoCuradoDTO;
import br.tourapp.iaservice.dto.RoteiroResponseDTO;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PreDestroy;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

// Orquestra a curadoria de uma lista de POIs através da cadeia de fallback de LLMs:
// Mistral local (Ollama, se habilitado) → Claude → Gemini → OpenAI → fallback final: POIs sem curadoria ("curado": false).

// Fluxo para cada provedor da cadeia, na ordem em que LlmProvidersConfig os monta:
// Chama o provedor com um timeout curto e independente do timeout interno do SDK → se responder dentro do prazo, faz o parsing seguro do JSON → casa cada POI curado com o POI original pelo campo nome. Qualquer falha faz a cadeia seguir para o próximo provedor, sem propagar a exceção. Caso todos falhem, cai no fallback final.

// Nota sobre o limite de caracteres da descrição (kyu.llm.max-descricao-chars): é reforçado apenas
// via instrução no prompt (ver PromptBuilder). Não há truncamento nem invalidação aqui caso o LLM
// ultrapasse — decisão consciente, revisitar se algum provedor (em especial modelos locais) mostrar
// tendência a estourar o limite na prática.

@Service
public class CuradoriaService {

    private static final Logger log = LoggerFactory.getLogger(CuradoriaService.class);

    private static final String TRILHA_TURISMO = "turismo";
    private static final String TRILHA_COMPRAS = "compras";
    private static final String TIPO_ALIMENTACAO = "alimentacao";
    private static final String TIPO_LAZER = "lazer";

    private final List<LlmProvider> providers;
    private final ObjectMapper objectMapper;
    private final FallbackChainProperties props;
    private final ExecutorService executor;

    public CuradoriaService(List<LlmProvider> providers, ObjectMapper objectMapper, FallbackChainProperties props) {
        this.providers = providers;
        this.objectMapper = objectMapper;
        this.props = props;

        this.executor = Executors.newVirtualThreadPerTaskExecutor();

        if (providers.isEmpty()) {
            log.warn("CuradoriaService iniciado sem nenhum provedor de LLM configurado");
        } else {
            log.info("Cadeia de fallback de LLMs configurada, em ordem: {}", nomesDaCadeia());
        }
    }

    @PreDestroy
    void encerrar() {
        executor.shutdown();
    }

    public RoteiroResponseDTO curarPontos(List<PontoBrutoDTO> pontos) {
        if (pontos == null || pontos.isEmpty()) {
            return new RoteiroResponseDTO(List.of(), false, null);
        }

        String prompt = PromptBuilder.montarPrompt(pontos, objectMapper, props.getMaxDescricaoChars());

        for (LlmProvider provider : providers) {
            try {
                String respostaBruta = chamarComTimeout(provider, prompt);
                Map<String, Object> respostaJson = LlmResponseParser.extrairJson(respostaBruta, objectMapper);
                List<Map<String, Object>> pontosCuradosLlm = extrairListaDePontos(respostaJson);

                RoteiroResponseDTO resultado = new RoteiroResponseDTO(
                        casarPontosCurados(pontos, pontosCuradosLlm), true, provider.modelo());

                log.info("Curadoria concluída via provedor '{}' (modelo {})", provider.nome(), provider.modelo());
                return resultado;
            } catch (TimeoutException e) {
                log.warn("Provedor '{}' excedeu o timeout de {}s — tentando o próximo da cadeia.",
                        provider.nome(), provider.timeout().toSeconds());
            } catch (Exception e) {
                log.warn("Provedor '{}' falhou ({}: {}) — tentando o próximo da cadeia.",
                        provider.nome(), e.getClass().getSimpleName(), e.getMessage());
            }
        }

        log.warn("Todos os provedores da cadeia falharam. Devolvendo POIs sem curadoria.");
        return fallbackCompleto(pontos);
    }

    private String chamarComTimeout(LlmProvider provider, String prompt) throws TimeoutException {
        Future<String> futuro = executor.submit(() -> provider.chamar(prompt));
        try {
            return futuro.get(provider.timeout().toMillis(), TimeUnit.MILLISECONDS);
        } catch (TimeoutException e) {
            futuro.cancel(true);
            throw e;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Thread interrompida ao aguardar resposta do provedor '" + provider.nome() + "'", e);
        } catch (ExecutionException e) {
            Throwable causa = e.getCause();
            if (causa instanceof RuntimeException runtimeException) {
                throw runtimeException;
            }
            throw new RuntimeException(causa);
        }
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> extrairListaDePontos(Map<String, Object> respostaJson) {
        Object pontos = respostaJson.get("pontos");
        if (!(pontos instanceof List<?> lista)) {
            throw new LlmResponseParseException("campo \"pontos\" ausente ou não é uma lista na resposta do LLM", String.valueOf(respostaJson));
        }
        return (List<Map<String, Object>>) lista;
    }

    private List<PontoCuradoDTO> casarPontosCurados(
            List<PontoBrutoDTO> pontosOriginais, List<Map<String, Object>> pontosCuradosLlm) {

        Map<String, Map<String, Object>> curadosPorNome = new HashMap<>();
        for (Map<String, Object> item : pontosCuradosLlm) {
            if (item != null && item.get("nome") instanceof String nome && !nome.isBlank()) {
                curadosPorNome.put(nome, item);
            }
        }

        List<PontoCuradoDTO> resultado = new ArrayList<>(pontosOriginais.size());
        for (PontoBrutoDTO original : pontosOriginais) {
            Map<String, Object> curado = curadosPorNome.get(original.nome());
            resultado.add(paraDto(original, curado));
        }
        return resultado;
    }

    private PontoCuradoDTO paraDto(PontoBrutoDTO original, Map<String, Object> curado) {
        String trilha = curado == null ? null : asStringOuNulo(curado.get("trilha"));
        String tipo = curado == null ? null : asStringOuNulo(curado.get("tipo"));
        String descricao = curado == null ? null : asStringOuNulo(curado.get("descricao"));

        boolean valido = curado != null
                && (TRILHA_TURISMO.equals(trilha) || TRILHA_COMPRAS.equals(trilha))
                && (TIPO_ALIMENTACAO.equals(tipo) || TIPO_LAZER.equals(tipo))
                && descricao != null && !descricao.isBlank();

        if (valido) {
            if (descricao.length() > props.getMaxDescricaoChars()) {
                log.warn("Descrição do POI '{}' excedeu o limite combinado ({} > {} caracteres) — aceitando mesmo assim, por decisão de produto.",
                        original.nome(), descricao.length(), props.getMaxDescricaoChars());
            }
            return new PontoCuradoDTO(
                    original.nome(), original.categoria(), original.coordenadas(), trilha, tipo, descricao, true);
        }
        return fallbackPonto(original);
    }

    private static String asStringOuNulo(Object valor) {
        return valor instanceof String s ? s : null;
    }

    // POI sem curadoria: mantém nome + categoria + coordenadas originais do maps.
    private PontoCuradoDTO fallbackPonto(PontoBrutoDTO original) {
        return new PontoCuradoDTO(
                original.nome(), original.categoria(), original.coordenadas(), null, null, null, false);
    }

    private RoteiroResponseDTO fallbackCompleto(List<PontoBrutoDTO> pontos) {
        List<PontoCuradoDTO> pontosFallback = pontos.stream().map(this::fallbackPonto).toList();
        return new RoteiroResponseDTO(pontosFallback, false, null);
    }

    private String nomesDaCadeia() {
        return providers.stream().map(LlmProvider::nome).reduce((a, b) -> a + " → " + b).orElse("(nenhum)");
    }
}
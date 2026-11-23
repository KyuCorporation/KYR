package br.tourapp.iaservice.config;

import br.tourapp.iaservice.curadoria.LlmProvider;
import br.tourapp.iaservice.curadoria.SpringAiLlmProvider;
import com.google.genai.Client;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.function.Function;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.anthropic.AnthropicChatModel;
import org.springframework.ai.anthropic.AnthropicChatOptions;
import org.springframework.ai.anthropic.api.AnthropicApi;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.google.genai.GoogleGenAiChatModel;
import org.springframework.ai.google.genai.GoogleGenAiChatOptions;
import org.springframework.ai.model.tool.ToolCallingManager;
import org.springframework.ai.ollama.OllamaChatModel;
import org.springframework.ai.ollama.api.OllamaApi;
import org.springframework.ai.ollama.api.OllamaChatOptions;
import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.ai.openai.api.OpenAiApi;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.retry.support.RetryTemplate;
import org.springframework.web.client.DefaultResponseErrorHandler;
import org.springframework.web.client.RestClient;
import org.springframework.web.reactive.function.client.WebClient;
import io.micrometer.observation.ObservationRegistry;

// Monta manualmente a cadeia de fallback de LLMs: Claude → Gemini → OpenAI → Mistral (Ollama local).
// O Mistral local só entra na cadeia se OLLAMA_ENABLED=true (opt-in, pois depende do daemon do Ollama
// rodando na máquina). Os demais provedores são opcionais: se a variável de ambiente da respectiva
// chave não estiver definida, aquele provedor simplesmente não entra na cadeia.

@Configuration
public class LlmProvidersConfig {

    private static final Logger log = LoggerFactory.getLogger(LlmProvidersConfig.class);

    // Dependências de infraestrutura injetadas para construção correta dos novos modelos do Spring AI
    private final RestClient.Builder restClientBuilder;
    private final WebClient.Builder webClientBuilder;
    private final ObservationRegistry observationRegistry;
    private final ToolCallingManager toolCallingManager;

    public LlmProvidersConfig(
            RestClient.Builder restClientBuilder,
            ObjectProvider<WebClient.Builder> webClientBuilderProvider,
            ObjectProvider<ObservationRegistry> observationRegistryProvider,
            ObjectProvider<ToolCallingManager> toolCallingManagerProvider) {

        this.restClientBuilder = restClientBuilder;

        // Uso de getIfAvailable para não quebrar a aplicação caso alguma dessas libs não esteja no classpath/contexto
        this.webClientBuilder = webClientBuilderProvider.getIfAvailable();
        this.observationRegistry = observationRegistryProvider.getIfAvailable(() -> ObservationRegistry.NOOP);
        // Sem um ToolCallingManager no contexto, usa o padrão: o modelo do Gemini não aceita nulo
        this.toolCallingManager = toolCallingManagerProvider.getIfAvailable(() -> ToolCallingManager.builder().build());
    }

    @Bean
    public List<LlmProvider> llmProviders(FallbackChainProperties props) {
        return montarCadeia(props, System::getenv);
    }

    // As variáveis de ambiente chegam por uma função para que os testes montem a cadeia sem alterar
    // o ambiente do processo. Em produção, é System::getenv.
    List<LlmProvider> montarCadeia(FallbackChainProperties props, Function<String, String> ambiente) {
        List<LlmProvider> providers = new ArrayList<>();

        adicionarSeConfigurado(providers, ambiente, "ANTHROPIC_API_KEY",
                apiKey -> anthropicProvider(apiKey, props));
        adicionarSeConfigurado(providers, ambiente, "GEMINI_API_KEY",
                apiKey -> geminiProvider(apiKey, props));
        adicionarSeConfigurado(providers, ambiente, "OPENAI_API_KEY",
                apiKey -> openAiProvider(apiKey, props));

        // Mistral local entra por último, como reserva: em CPU ele leva dezenas de segundos e pode
        // estourar o timeout, então só é tentado quando os provedores em nuvem falham ou não têm chave
        adicionarOllamaSeHabilitado(providers, ambiente, props);

        if (providers.isEmpty()) {
            log.warn("Nenhuma chave de LLM configurada na cadeia de fallback.");
        }

        return List.copyOf(providers);
    }

    private void adicionarSeConfigurado(List<LlmProvider> providers, Function<String, String> ambiente,
            String envVar, Function<String, LlmProvider> fabrica) {
        String valor = ambiente.apply(envVar);
        if (valor != null && !valor.isBlank()) {
            providers.add(fabrica.apply(valor));
            log.info("Provedor configurado a partir de {}: entra na cadeia de fallback.", envVar);
        } else {
            log.warn("{} não definida. Este provedor fica de fora da cadeia de fallback.", envVar);
        }
    }

    // Gate separado do padrão adicionarSeConfigurado porque o Ollama não usa API key: é opt-in via flag,
    // já que só faz sentido em máquinas com o daemon `ollama serve` rodando localmente.
    private void adicionarOllamaSeHabilitado(
            List<LlmProvider> providers, Function<String, String> ambiente, FallbackChainProperties props) {
        String habilitado = ambiente.apply("OLLAMA_ENABLED");
        if (habilitado != null && habilitado.equalsIgnoreCase("true")) {
            providers.add(ollamaProvider(ambiente, props));
            log.info("Mistral local (Ollama) habilitado via OLLAMA_ENABLED: entra na cadeia de fallback.");
        } else {
            log.warn("OLLAMA_ENABLED não definida como 'true'. Mistral local fica de fora da cadeia de fallback.");
        }
    }

    private LlmProvider ollamaProvider(Function<String, String> ambiente, FallbackChainProperties props) {
        String baseUrl = Optional.ofNullable(ambiente.apply("OLLAMA_BASE_URL")).orElse("http://localhost:11434");
        String modelo = Optional.ofNullable(ambiente.apply("OLLAMA_MODEL")).orElse("mistral");

        OllamaApi.Builder apiBuilder = OllamaApi.builder()
                .baseUrl(baseUrl)
                .restClientBuilder(restClientBuilder.clone());

        if (webClientBuilder != null) {
            apiBuilder.webClientBuilder(webClientBuilder.clone());
        }

        OllamaApi api = apiBuilder.build();

        OllamaChatOptions options = OllamaChatOptions.builder()
                .model(modelo)
                .build();

        ChatModel chatModel = OllamaChatModel.builder()
                .ollamaApi(api)
                .defaultOptions(options)
                .observationRegistry(observationRegistry)
                .toolCallingManager(toolCallingManager)
                .build();

        return new SpringAiLlmProvider("ollama-mistral", modelo, props.getOllamaTimeout(), chatModel);
    }

    private LlmProvider anthropicProvider(String apiKey, FallbackChainProperties props) {

        // Instanciamento utilizando exclusivamente o Builder (Construtor agora é private)
        AnthropicApi.Builder apiBuilder = AnthropicApi.builder()
                .baseUrl("https://api.anthropic.com")
                .anthropicVersion("2023-06-01")
                .apiKey(apiKey) // O builder aceita a String diretamente
                .restClientBuilder(restClientBuilder.clone())
                .responseErrorHandler(new DefaultResponseErrorHandler());

        // A injeção condicional do WebClientBuilder previne NullPointerExceptions
        if (webClientBuilder != null) {
            apiBuilder.webClientBuilder(webClientBuilder.clone());
        }

        AnthropicApi api = apiBuilder.build();

        AnthropicChatOptions options = AnthropicChatOptions.builder()
                .model(props.getAnthropicModel())
                .maxTokens(props.getMaxTokens())
                .build();

        // Passando as mesmas dependências de infra (Observation/Tooling) para consistência
        ChatModel chatModel = AnthropicChatModel.builder()
                .anthropicApi(api)
                .defaultOptions(options)
                .retryTemplate(semRetentativaInterna())
                .observationRegistry(observationRegistry)
                .toolCallingManager(toolCallingManager)
                .build();

        return new SpringAiLlmProvider("anthropic", props.getAnthropicModel(), props.getTimeout(), chatModel);
    }

    private LlmProvider geminiProvider(String apiKey, FallbackChainProperties props) {
        Client client = Client.builder().apiKey(apiKey).build();
        GoogleGenAiChatOptions options = GoogleGenAiChatOptions.builder()
                .model(props.getGeminiModel())
                .maxOutputTokens(props.getMaxTokens())
                .build();

        // A API do GoogleGenAiChatModel exige injeção das métricas, retry e chamadas de ferramenta
        ChatModel chatModel = new GoogleGenAiChatModel(
                client,
                options,
                toolCallingManager,
                semRetentativaInterna(),
                observationRegistry
        );

        return new SpringAiLlmProvider("gemini", props.getGeminiModel(), props.getTimeout(), chatModel);
    }

    private LlmProvider openAiProvider(String apiKey, FallbackChainProperties props) {
        OpenAiApi api = OpenAiApi.builder().apiKey(apiKey).build();
        OpenAiChatOptions options = OpenAiChatOptions.builder()
                .model(props.getOpenaiModel())
                .maxTokens(props.getMaxTokens())
                .build();

        ChatModel chatModel = OpenAiChatModel.builder()
                .openAiApi(api)
                .defaultOptions(options)
                .retryTemplate(semRetentativaInterna())
                .observationRegistry(observationRegistry)
                .toolCallingManager(toolCallingManager)
                .build();

        return new SpringAiLlmProvider("openai", props.getOpenaiModel(), props.getTimeout(), chatModel);
    }

    private RetryTemplate semRetentativaInterna() {
        return RetryTemplate.builder().maxAttempts(1).build();
    }
}
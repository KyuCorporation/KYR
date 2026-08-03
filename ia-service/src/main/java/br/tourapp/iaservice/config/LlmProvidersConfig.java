package br.tourapp.iaservice.config;

import br.tourapp.iaservice.curadoria.LlmProvider;
import br.tourapp.iaservice.curadoria.SpringAiLlmProvider;
import com.google.genai.Client;
import java.util.ArrayList;
import java.util.List;
import java.util.function.Function;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.anthropic.AnthropicChatModel;
import org.springframework.ai.anthropic.AnthropicChatOptions;
import org.springframework.ai.anthropic.api.AnthropicApi;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.google.genai.GoogleGenAiChatModel;
import org.springframework.ai.google.genai.GoogleGenAiChatOptions;
import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.ai.openai.api.OpenAiApi;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.retry.support.RetryTemplate;

// Monta manualmente a cadeia de fallback de LLMs: Claude → Gemini → OpenAI. Cada provedor é opcional, caso a variável de ambiente da respectiva chave não estiver definida, aquele provedor simplesmente não entra na cadeia.

@Configuration
public class LlmProvidersConfig {

    private static final Logger log = LoggerFactory.getLogger(LlmProvidersConfig.class);

    @Bean
    public List<LlmProvider> llmProviders(FallbackChainProperties props) {
        List<LlmProvider> providers = new ArrayList<>();

        adicionarSeConfigurado(providers, "ANTHROPIC_API_KEY",
                apiKey -> anthropicProvider(apiKey, props));
        adicionarSeConfigurado(providers, "GEMINI_API_KEY",
                apiKey -> geminiProvider(apiKey, props));
        adicionarSeConfigurado(providers, "OPENAI_API_KEY",
                apiKey -> openAiProvider(apiKey, props));

        if (providers.isEmpty()) {
            log.warn("Nenhuma chave de LLM configurada");
        }

        return List.copyOf(providers);
    }

    private void adicionarSeConfigurado(
            List<LlmProvider> providers, String envVar, Function<String, LlmProvider> fabrica) {
        String valor = System.getenv(envVar);
        if (valor != null && !valor.isBlank()) {
            providers.add(fabrica.apply(valor));
            log.info("Provedor configurado a partir de {}: entra na cadeia de fallback.", envVar);
        } else {
            log.warn("{} não definida. Este provedor fica de fora da cadeia de fallback.", envVar);
        }
    }

    private LlmProvider anthropicProvider(String apiKey, FallbackChainProperties props) {
        AnthropicApi api = new AnthropicApi(apiKey);
        AnthropicChatOptions options = AnthropicChatOptions.builder()
                .model(props.getAnthropicModel())
                .maxTokens(props.getMaxTokens())
                .build();
        ChatModel chatModel = AnthropicChatModel.builder()
                .anthropicApi(api)
                .defaultOptions(options)
                .retryTemplate(semRetentativaInterna())
                .build();
        return new SpringAiLlmProvider("anthropic", props.getAnthropicModel(), props.getTimeout(), chatModel);
    }

    private LlmProvider geminiProvider(String apiKey, FallbackChainProperties props) {
        Client client = Client.builder().apiKey(apiKey).build();
        GoogleGenAiChatOptions options = GoogleGenAiChatOptions.builder()
                .model(props.getGeminiModel())
                .maxOutputTokens(props.getMaxTokens())
                .build();
        ChatModel chatModel = new GoogleGenAiChatModel(client, options);
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
                .build();
        return new SpringAiLlmProvider("openai", props.getOpenaiModel(), props.getTimeout(), chatModel);
    }

    private RetryTemplate semRetentativaInterna() {
        return RetryTemplate.builder().maxAttempts(1).build();
    }
}

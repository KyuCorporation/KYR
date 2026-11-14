package br.tourapp.iaservice.config;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

// Configuração da cadeia de fallback de LLMs.

@ConfigurationProperties(prefix = "kyu.llm")
public class FallbackChainProperties {
    private int timeoutSeconds = 8;

    // 10 POIs com descrição passam de 1024 tokens; com o limite antigo o JSON vinha cortado e a curadoria falhava.
    private int maxTokens = 4096;

    // Limite de caracteres da descrição gerada, combinado com o frontend (US de classificação de POI).
    // Reforçado apenas via instrução no prompt — não há truncamento nem invalidação no service caso o LLM ultrapasse.
    private int maxDescricaoChars = 300;

    private String anthropicModel = "claude-haiku-4-5-20251001";
    private String geminiModel = "gemini-3.5-flash-lite";
    private String openaiModel = "gpt-4o-mini";

    public int getTimeoutSeconds() {
        return timeoutSeconds;
    }

    public void setTimeoutSeconds(int timeoutSeconds) {
        this.timeoutSeconds = timeoutSeconds;
    }

    public Duration getTimeout() {
        return Duration.ofSeconds(timeoutSeconds);
    }

    public int getMaxTokens() {
        return maxTokens;
    }

    public void setMaxTokens(int maxTokens) {
        this.maxTokens = maxTokens;
    }

    public int getMaxDescricaoChars() {
        return maxDescricaoChars;
    }

    public void setMaxDescricaoChars(int maxDescricaoChars) {
        this.maxDescricaoChars = maxDescricaoChars;
    }

    public String getAnthropicModel() {
        return anthropicModel;
    }

    public void setAnthropicModel(String anthropicModel) {
        this.anthropicModel = anthropicModel;
    }

    public String getGeminiModel() {
        return geminiModel;
    }

    public void setGeminiModel(String geminiModel) {
        this.geminiModel = geminiModel;
    }

    public String getOpenaiModel() {
        return openaiModel;
    }

    public void setOpenaiModel(String openaiModel) {
        this.openaiModel = openaiModel;
    }

    private int ollamaTimeoutSeconds = 30;

    public int getOllamaTimeoutSeconds() {
        return ollamaTimeoutSeconds;
    }

    public void setOllamaTimeoutSeconds(int ollamaTimeoutSeconds) {
        this.ollamaTimeoutSeconds = ollamaTimeoutSeconds;
    }

    public Duration getOllamaTimeout() {
        return Duration.ofSeconds(ollamaTimeoutSeconds);
    }
}
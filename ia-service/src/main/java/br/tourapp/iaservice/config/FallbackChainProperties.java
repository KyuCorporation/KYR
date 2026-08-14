package br.tourapp.iaservice.config;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

// Configuração da cadeia de fallback de LLMs.

@ConfigurationProperties(prefix = "kyu.llm")
public class FallbackChainProperties {
    private int timeoutSeconds = 8;

    private int maxTokens = 1024;

    private String anthropicModel = "claude-haiku-4-5-20251001";
    private String geminiModel = "gemini-2.5-flash";
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
}

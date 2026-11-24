package br.tourapp.iaservice.curadoria;

import java.time.Duration;

// Um elo da cadeia de fallback de LLMs: Claude → Gemini → OpenAI → Mistral local (Ollama) → sem curadoria.

// Cada implementação envolve um ChatModel do Spring AI já configurado com chave e modelo. Ver config.LlmProvidersConfig, onde os provedores são montados manualmente a partir de variáveis de ambiente.

public interface LlmProvider {
    String nome();

    // ex: "claude-haiku-4-5-20251001"
    String modelo();

    Duration timeout();

    String chamar(String prompt);
}

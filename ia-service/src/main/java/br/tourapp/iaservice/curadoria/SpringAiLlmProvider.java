package br.tourapp.iaservice.curadoria;

import java.time.Duration;
import java.util.Objects;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.prompt.Prompt;

// Adapta qualquer modelo de chat do spring ai para LlmProvider.

public final class SpringAiLlmProvider implements LlmProvider {

    private final String nome;
    private final String modelo;
    private final Duration timeout;
    private final ChatModel chatModel;

    public SpringAiLlmProvider(String nome, String modelo, Duration timeout, ChatModel chatModel) {
        this.nome = Objects.requireNonNull(nome, "nome");
        this.modelo = Objects.requireNonNull(modelo, "modelo");
        this.timeout = Objects.requireNonNull(timeout, "timeout");
        this.chatModel = Objects.requireNonNull(chatModel, "chatModel");
    }

    @Override
    public String nome() {
        return nome;
    }

    @Override
    public String modelo() {
        return modelo;
    }

    @Override
    public Duration timeout() {
        return timeout;
    }

    @Override
    public String chamar(String prompt) {
        ChatResponse response = chatModel.call(new Prompt(prompt));
        return response.getResult().getOutput().getText();
    }
}

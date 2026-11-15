package br.tourapp.iaservice.curadoria;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.Duration;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.model.Generation;
import org.springframework.ai.chat.prompt.Prompt;

class SpringAiLlmProviderTest {

    @Test
    void juntaARespostaQuandoOModeloDevolveOTextoEmVariasPartes() {
        ChatModel chatModel = mock(ChatModel.class);
        when(chatModel.call(any(Prompt.class))).thenReturn(new ChatResponse(List.of(
                new Generation(new AssistantMessage("{\"pontos\": [{\"nome\": \"Fino Corte\", \"descricao\": \"Steakhouse")),
                new Generation(new AssistantMessage(" especializada em carnes.\"}]}")))));

        String resposta = new SpringAiLlmProvider("gemini", "gemini-3.5-flash-lite", Duration.ofSeconds(8), chatModel)
                .chamar("prompt");

        assertThat(resposta).isEqualTo("{\"pontos\": [{\"nome\": \"Fino Corte\", \"descricao\": \"Steakhouse especializada em carnes.\"}]}");
    }

    @Test
    void devolveOTextoDeUmaRespostaDeParteUnica() {
        ChatModel chatModel = mock(ChatModel.class);
        when(chatModel.call(any(Prompt.class))).thenReturn(new ChatResponse(List.of(
                new Generation(new AssistantMessage("{\"pontos\": []}")))));

        String resposta = new SpringAiLlmProvider("openai", "gpt-4o-mini", Duration.ofSeconds(8), chatModel).chamar("prompt");

        assertThat(resposta).isEqualTo("{\"pontos\": []}");
    }
}

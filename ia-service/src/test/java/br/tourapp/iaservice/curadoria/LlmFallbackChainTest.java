package br.tourapp.iaservice.curadoria;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import br.tourapp.iaservice.dto.PontoBrutoDTO;
import br.tourapp.iaservice.dto.RoteiroResponseDTO;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Duration;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.model.Generation;
import org.springframework.ai.chat.prompt.Prompt;

class LlmFallbackChainTest {

    private static final List<PontoBrutoDTO> PONTOS_EXEMPLO = List.of(
            new PontoBrutoDTO("Marco das Três Fronteiras", "tourist_attraction", List.of(-25.58, -54.60)),
            new PontoBrutoDTO("Shopping Cataratas JL", "shopping_mall", List.of(-25.55, -54.58)));

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void avancaParaProximoProvedorQuandoOPrimeiroEstouraOTimeout() {
        LlmProvider claude = providerLento("claude", Duration.ofMillis(150), Duration.ofMillis(600));
        LlmProvider gemini = providerComSucesso("gemini", "gemini-2.5-flash", respostaCompleta());

        CuradoriaService service = new CuradoriaService(List.of(claude, gemini), objectMapper);

        RoteiroResponseDTO resultado = service.curarPontos(PONTOS_EXEMPLO);

        assertThat(resultado.curadoPorIa()).isTrue();
        assertThat(resultado.modeloUtilizado()).isEqualTo("gemini-2.5-flash");
        assertThat(resultado.pontos()).allMatch(p -> p.curado());
    }

    @Test
    void avancaParaProximoProvedorQuandoOPrimeiroLancaErro() {
        LlmProvider claude = providerComErro("claude");
        LlmProvider gemini = providerComSucesso("gemini", "gemini-2.5-flash", respostaCompleta());

        CuradoriaService service = new CuradoriaService(List.of(claude, gemini), objectMapper);

        RoteiroResponseDTO resultado = service.curarPontos(PONTOS_EXEMPLO);

        assertThat(resultado.curadoPorIa()).isTrue();
        assertThat(resultado.modeloUtilizado()).isEqualTo("gemini-2.5-flash");
    }

    @Test
    void caiNoFallbackCompletoQuandoTodosOsProvedoresFalham() {
        LlmProvider claude = providerComErro("claude");
        LlmProvider gemini = providerComErro("gemini");
        LlmProvider openai = providerComErro("openai");

        CuradoriaService service = new CuradoriaService(List.of(claude, gemini, openai), objectMapper);

        RoteiroResponseDTO resultado = service.curarPontos(PONTOS_EXEMPLO);

        assertThat(resultado.curadoPorIa()).isFalse();
        assertThat(resultado.modeloUtilizado()).isNull();
        assertThat(resultado.pontos()).hasSize(PONTOS_EXEMPLO.size());
        assertThat(resultado.pontos()).allMatch(p -> !p.curado());
        assertThat(resultado.pontos()).allMatch(p -> p.descricao() == null);
        // nome e categoria originais precisam ser preservados no fallback
        assertThat(resultado.pontos().get(0).nome()).isEqualTo("Marco das Três Fronteiras");
        assertThat(resultado.pontos().get(0).categoria()).isEqualTo("tourist_attraction");
    }

    @Test
    void caiNoFallbackCompletoQuandoNenhumProvedorEstaConfigurado() {
        CuradoriaService service = new CuradoriaService(List.of(), objectMapper);

        RoteiroResponseDTO resultado = service.curarPontos(PONTOS_EXEMPLO);

        assertThat(resultado.curadoPorIa()).isFalse();
        assertThat(resultado.pontos()).allMatch(p -> !p.curado());
    }

    @Test
    void fallbackIndividualQuandoLlmEsqueceUmPoi() {
        String respostaParcial = """
                {"pontos": [
                  {"nome": "Marco das Três Fronteiras", "trilha": "turismo", "tipo": "lazer",
                   "descricao": "Ponto turístico na tríplice fronteira."}
                ]}
                """;
        LlmProvider gemini = providerComSucesso("gemini", "gemini-2.5-flash", respostaParcial);

        CuradoriaService service = new CuradoriaService(List.of(gemini), objectMapper);

        RoteiroResponseDTO resultado = service.curarPontos(PONTOS_EXEMPLO);

        assertThat(resultado.curadoPorIa()).isTrue();
        var marco = resultado.pontos().get(0);
        var shopping = resultado.pontos().get(1);
        assertThat(marco.curado()).isTrue();
        assertThat(marco.trilha()).isEqualTo("turismo");
        assertThat(shopping.curado()).isFalse();
        assertThat(shopping.nome()).isEqualTo("Shopping Cataratas JL");
    }

    @Test
    void naoPropagaExcecaoDoProvedor() {
        LlmProvider claude = providerComErro("claude");
        CuradoriaService service = new CuradoriaService(List.of(claude), objectMapper);

        service.curarPontos(PONTOS_EXEMPLO);
    }

    private static String respostaCompleta() {
        return """
                {"pontos": [
                  {"nome": "Marco das Três Fronteiras", "trilha": "turismo", "tipo": "lazer",
                   "descricao": "Ponto turístico na tríplice fronteira."},
                  {"nome": "Shopping Cataratas JL", "trilha": "compras", "tipo": "lazer",
                   "descricao": "Shopping popular na região."}
                ]}
                """;
    }

    private LlmProvider providerComSucesso(String nome, String modelo, String respostaTexto) {
        ChatModel chatModel = mock(ChatModel.class);
        when(chatModel.call(any(Prompt.class))).thenReturn(respostaChatCom(respostaTexto));
        return new SpringAiLlmProvider(nome, modelo, Duration.ofSeconds(8), chatModel);
    }

    private LlmProvider providerComErro(String nome) {
        ChatModel chatModel = mock(ChatModel.class);
        when(chatModel.call(any(Prompt.class))).thenThrow(new RuntimeException("erro simulado do provedor " + nome));
        return new SpringAiLlmProvider(nome, nome + "-modelo", Duration.ofSeconds(8), chatModel);
    }

    private LlmProvider providerLento(String nome, Duration timeout, Duration atrasoReal) {
        ChatModel chatModel = mock(ChatModel.class);
        when(chatModel.call(any(Prompt.class))).thenAnswer(invocation -> {
            Thread.sleep(atrasoReal.toMillis());
            return respostaChatCom(respostaCompleta());
        });
        return new SpringAiLlmProvider(nome, nome + "-modelo", timeout, chatModel);
    }

    private static ChatResponse respostaChatCom(String texto) {
        return new ChatResponse(List.of(new Generation(new AssistantMessage(texto))));
    }
}

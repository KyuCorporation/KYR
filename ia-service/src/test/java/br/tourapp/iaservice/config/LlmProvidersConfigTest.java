package br.tourapp.iaservice.config;

import br.tourapp.iaservice.curadoria.LlmProvider;
import io.micrometer.observation.ObservationRegistry;
import org.junit.jupiter.api.Test;
import org.springframework.ai.model.tool.ToolCallingManager;
import org.springframework.beans.factory.support.DefaultListableBeanFactory;
import org.springframework.web.client.RestClient;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.tuple;

// Montagem da cadeia de fallback a partir das variáveis de ambiente. Nenhum provedor é chamado:
// os modelos do Spring AI são só construídos, com chaves falsas.
class LlmProvidersConfigTest {

    private final DefaultListableBeanFactory semBeans = new DefaultListableBeanFactory();
    private final LlmProvidersConfig config = new LlmProvidersConfig(
            RestClient.builder(),
            semBeans.getBeanProvider(WebClient.Builder.class),
            semBeans.getBeanProvider(ObservationRegistry.class),
            semBeans.getBeanProvider(ToolCallingManager.class));

    private List<LlmProvider> cadeia(Map<String, String> ambiente) {
        return config.montarCadeia(new FallbackChainProperties(), ambiente::get);
    }

    @Test
    void semNenhumaVariavelACadeiaFicaVazia() {
        assertThat(cadeia(Map.of())).isEmpty();
    }

    @Test
    void comTudoConfiguradoSegueAOrdemDePrioridadeComOModeloLocalPorUltimo() {
        List<LlmProvider> provedores = cadeia(Map.of(
                "ANTHROPIC_API_KEY", "chave-falsa-1",
                "GEMINI_API_KEY", "chave-falsa-2",
                "OPENAI_API_KEY", "chave-falsa-3",
                "OLLAMA_ENABLED", "true"));

        assertThat(provedores).extracting(LlmProvider::nome, LlmProvider::modelo).containsExactly(
                tuple("anthropic", "claude-haiku-4-5-20251001"),
                tuple("gemini", "gemini-3.5-flash-lite"),
                tuple("openai", "gpt-4o-mini"),
                tuple("ollama-mistral", "mistral"));
    }

    @Test
    void soEntraQuemTemChaveNaoVazia() {
        List<LlmProvider> provedores = cadeia(Map.of(
                "ANTHROPIC_API_KEY", "   ",
                "GEMINI_API_KEY", "chave-falsa"));

        assertThat(provedores).extracting(LlmProvider::nome).containsExactly("gemini");
    }

    @Test
    void oModeloLocalSoEntraComOllamaEnabledIgualATrue() {
        assertThat(cadeia(Map.of("OLLAMA_ENABLED", "TRUE"))).extracting(LlmProvider::nome).containsExactly("ollama-mistral");
        assertThat(cadeia(Map.of("OLLAMA_ENABLED", "1"))).isEmpty();
        assertThat(cadeia(Map.of("OLLAMA_ENABLED", "false"))).isEmpty();
    }

    @Test
    void respeitaOModeloLocalEOsModelosETemposConfigurados() {
        FallbackChainProperties props = new FallbackChainProperties();
        props.setGeminiModel("gemini-outro");
        props.setTimeoutSeconds(5);

        List<LlmProvider> provedores = config.montarCadeia(props, Map.of(
                "GEMINI_API_KEY", "chave-falsa",
                "OLLAMA_ENABLED", "true",
                "OLLAMA_MODEL", "llama3")::get);

        assertThat(provedores).extracting(LlmProvider::nome, LlmProvider::modelo)
                .containsExactly(tuple("gemini", "gemini-outro"), tuple("ollama-mistral", "llama3"));
        assertThat(provedores.getFirst().timeout()).isEqualTo(Duration.ofSeconds(5));
    }

    @Test
    void aCadeiaDevolvidaNaoPodeSerAlterada() {
        List<LlmProvider> provedores = cadeia(Map.of("GEMINI_API_KEY", "chave-falsa"));

        assertThatThrownBy(() -> provedores.add(provedores.getFirst()))
                .isInstanceOf(UnsupportedOperationException.class);
    }
}

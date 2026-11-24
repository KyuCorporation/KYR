package br.tourapp.iaservice.curadoria;

import br.tourapp.iaservice.dto.PontoBrutoDTO;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class PromptBuilderTest {

    @Test
    void naoPrendeOPromptAUmaCidadeEInformaOLimiteEOsPontos() {
        String prompt = PromptBuilder.montarPrompt(
                List.of(new PontoBrutoDTO("Mercado de São José", "market", List.of(-8.0689, -34.8786))),
                new ObjectMapper(), 300);

        // O sistema aceita qualquer origem e destino: o prompt não pode situar o modelo em Foz do Iguaçu.
        assertThat(prompt).doesNotContain("Foz do Iguaçu").doesNotContain("evento");
        assertThat(prompt).contains("no máximo 300 caracteres").contains("Mercado de São José");
    }
}

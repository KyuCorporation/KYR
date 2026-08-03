package br.tourapp.iaservice.curadoria;

import static org.assertj.core.api.Assertions.assertThat;

import br.tourapp.iaservice.dto.PontoBrutoDTO;
import br.tourapp.iaservice.dto.RoteiroResponseDTO;
import java.util.List;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
@EnabledIfEnvironmentVariable(named = "RUN_LLM_INTEGRATION_TESTS", matches = "1")
class CuradoriaServiceIntegrationTest {

    @Autowired
    private CuradoriaService curadoriaService;

    private static final List<PontoBrutoDTO> PONTOS_REAIS = List.of(
            new PontoBrutoDTO("Marco das Três Fronteiras", "tourist_attraction", List.of(-25.5947, -54.6118)),
            new PontoBrutoDTO("Shopping Catuaí Palladium", "shopping_mall", List.of(-25.5461, -54.5534)),
            new PontoBrutoDTO("Rafain Churrascaria Show", "restaurant", List.of(-25.5729, -54.4841)));

    @Test
    void curadoriaRealPreencheTrilhaTipoEDescricao() {
        RoteiroResponseDTO resultado = curadoriaService.curarPontos(PONTOS_REAIS);

        assertThat(resultado.curadoPorIa()).isTrue();
        assertThat(resultado.modeloUtilizado()).isNotBlank();
        assertThat(resultado.pontos()).hasSize(PONTOS_REAIS.size());

        resultado.pontos().forEach(ponto -> {
            assertThat(ponto.curado()).isTrue();
            assertThat(ponto.trilha()).isIn("turismo", "compras");
            assertThat(ponto.tipo()).isIn("alimentacao", "lazer");
            assertThat(ponto.descricao()).isNotBlank();
        });
    }
}

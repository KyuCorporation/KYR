package br.tourapp.kyr;

import br.tourapp.kyr.conta.LimiteDeTentativas;
import br.tourapp.kyr.service.CuradoriaCache;
import br.tourapp.kyr.service.JdbcCuradoriaCache;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.ApplicationContext;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// Sobe a aplicação inteira contra o Postgres real: configuração, migração do Flyway, segurança e as
// rotas atravessando todos os filtros. Não chama o Google nem o ia-service.
@Testcontainers(disabledWithoutDocker = true)
@SpringBootTest(properties = {"google.maps.api-key=chave-de-teste", "ia-service.base-url=http://localhost:1"})
@AutoConfigureMockMvc
class AplicacaoSobeTest extends PostgresDeTeste {

    @DynamicPropertySource
    static void banco(DynamicPropertyRegistry propriedades) {
        PostgreSQLContainer postgres = iniciar();
        propriedades.add("spring.datasource.url", postgres::getJdbcUrl);
        propriedades.add("spring.datasource.username", postgres::getUsername);
        propriedades.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ApplicationContext contexto;

    @Test
    void healthCheckRespondeUpSemDetalhes() throws Exception {
        mockMvc.perform(get("/actuator/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"))
                .andExpect(jsonPath("$.components").doesNotExist());
    }

    @Test
    void usaOCacheNoBancoEOLimiteDeTentativas() {
        assertThat(contexto.getBean(CuradoriaCache.class)).isInstanceOf(JdbcCuradoriaCache.class);
        assertThat(contexto.getBean(LimiteDeTentativas.class)).isNotNull();
    }

    @Test
    void outrosEndpointsDoActuatorNaoFicamExpostos() throws Exception {
        mockMvc.perform(get("/actuator/env")).andExpect(status().isNotFound());
    }

    @Test
    void loginPassaPelosFiltrosDeSegurancaSemCsrfEChegaAoServico() throws Exception {
        mockMvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"ninguem@exemplo.com\",\"senha\":\"qualquer-123\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.codigo").value("credenciais_invalidas"));
    }

    @Test
    void cadastroEDepoisEuFuncionamDePontaAPonta() throws Exception {
        String corpo = mockMvc.perform(post("/auth/cadastro").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nome\":\"Ana\",\"email\":\"ana@exemplo.com\",\"senha\":\"senha-certa-123\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String token = corpo.replaceAll(".*\"token\":\"([^\"]+)\".*", "$1");

        mockMvc.perform(get("/auth/eu").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("ana@exemplo.com"));
    }

    @Test
    void roteiroInvalidoERecusadoAntesDeChamarOGoogle() throws Exception {
        mockMvc.perform(post("/roteiros").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest());
    }
}

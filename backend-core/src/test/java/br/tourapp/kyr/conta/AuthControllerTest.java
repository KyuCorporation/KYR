package br.tourapp.kyr.conta;

import br.tourapp.kyr.conta.ContaDtos.SessaoResposta;
import br.tourapp.kyr.conta.ContaDtos.Usuario;
import br.tourapp.kyr.conta.ContaDtos.UsuarioResposta;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AuthController.class)
@Import(LimiteDeTentativas.class)
@AutoConfigureMockMvc(addFilters = false)
class AuthControllerTest {

    private static final String CREDENCIAIS = "{\"email\":\"ana@exemplo.com\",\"senha\":\"errada-123\"}";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ContaService contaService;

    @Autowired
    private LimiteDeTentativas limites;

    @BeforeEach
    void zerarLimites() {
        limites.esquecerTudo();
    }

    private static ContaException credenciaisInvalidas() {
        return new ContaException(HttpStatus.UNAUTHORIZED, "credenciais_invalidas", "E-mail ou senha incorretos.");
    }

    private ResultActions entrar(String corpo, String ip) throws Exception {
        return mockMvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                .header("X-Forwarded-For", ip).content(corpo));
    }

    @Test
    void loginBloqueiaOEmailDepoisDeCincoSenhasErradas() throws Exception {
        when(contaService.entrar(any())).thenThrow(credenciaisInvalidas());

        for (int i = 0; i < 5; i++) {
            entrar(CREDENCIAIS, "203.0.113." + i).andExpect(status().isUnauthorized());
        }
        // Mesmo e-mail com outra caixa e de outro IP: continua bloqueado.
        entrar("{\"email\":\" ANA@exemplo.com\",\"senha\":\"outra-123\"}", "198.51.100.9")
                .andExpect(status().isTooManyRequests())
                .andExpect(header().string("Retry-After", "900"))
                .andExpect(jsonPath("$.codigo").value("muitas_tentativas"))
                .andExpect(jsonPath("$.mensagem").value("Muitas tentativas. Tente de novo em 15 minutos."));

        verify(contaService, times(5)).entrar(any());
    }

    @Test
    void loginCertoZeraAsFalhasDoEmail() throws Exception {
        when(contaService.entrar(any()))
                .thenThrow(credenciaisInvalidas(), credenciaisInvalidas(), credenciaisInvalidas(), credenciaisInvalidas())
                .thenReturn(new SessaoResposta("token", new UsuarioResposta("Ana", "ana@exemplo.com")))
                .thenThrow(credenciaisInvalidas());

        for (int i = 0; i < 4; i++) {
            entrar(CREDENCIAIS, "203.0.113.1").andExpect(status().isUnauthorized());
        }
        entrar(CREDENCIAIS, "203.0.113.1").andExpect(status().isOk());
        for (int i = 0; i < 5; i++) {
            entrar(CREDENCIAIS, "203.0.113.1").andExpect(status().isUnauthorized());
        }
    }

    @Test
    void loginBloqueiaOIpQueTestaMuitasContas() throws Exception {
        when(contaService.entrar(any())).thenThrow(credenciaisInvalidas());

        for (int i = 0; i < 30; i++) {
            entrar("{\"email\":\"conta" + i + "@exemplo.com\",\"senha\":\"errada-123\"}", "203.0.113.7")
                    .andExpect(status().isUnauthorized());
        }
        entrar("{\"email\":\"nova@exemplo.com\",\"senha\":\"errada-123\"}", "203.0.113.7")
                .andExpect(status().isTooManyRequests());
        // Trocar o início do X-Forwarded-For não ajuda: vale o último endereço, anotado pelo proxy.
        entrar("{\"email\":\"nova@exemplo.com\",\"senha\":\"errada-123\"}", "10.9.9.9, 203.0.113.7")
                .andExpect(status().isTooManyRequests());
        entrar("{\"email\":\"nova@exemplo.com\",\"senha\":\"errada-123\"}", "198.51.100.9")
                .andExpect(status().isUnauthorized());
    }

    @Test
    void loginsCertosNaoContamParaOLimiteDoIp() throws Exception {
        when(contaService.entrar(any())).thenReturn(new SessaoResposta("token", new UsuarioResposta("Ana", "ana@exemplo.com")));

        for (int i = 0; i < 40; i++) {
            entrar("{\"email\":\"pessoa" + i + "@exemplo.com\",\"senha\":\"certa-123\"}", "203.0.113.7")
                    .andExpect(status().isOk());
        }
    }

    @Test
    void cadastroLimitaDezTentativasPorIpPorHora() throws Exception {
        when(contaService.cadastrar(any())).thenThrow(
                new ContaException(HttpStatus.CONFLICT, "email_ja_cadastrado", "Já existe uma conta com esse e-mail."));

        for (int i = 0; i < 10; i++) {
            mockMvc.perform(post("/auth/cadastro").contentType(MediaType.APPLICATION_JSON).header("X-Forwarded-For", "203.0.113.7")
                            .content("{\"nome\":\"Ana\",\"email\":\"ana" + i + "@exemplo.com\",\"senha\":\"senha-forte-1\"}"))
                    .andExpect(status().isConflict());
        }
        mockMvc.perform(post("/auth/cadastro").contentType(MediaType.APPLICATION_JSON).header("X-Forwarded-For", "203.0.113.7")
                        .content("{\"nome\":\"Ana\",\"email\":\"outra@exemplo.com\",\"senha\":\"senha-forte-1\"}"))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().string("Retry-After", "3600"));

        verify(contaService, times(10)).cadastrar(any());
    }

    @Test
    void cadastroDevolve201ComTokenEUsuarioSemASenha() throws Exception {
        when(contaService.cadastrar(any())).thenReturn(new SessaoResposta("token-de-teste", new UsuarioResposta("Ana Lima", "ana@exemplo.com")));

        mockMvc.perform(post("/auth/cadastro").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nome\":\"Ana Lima\",\"email\":\"ana@exemplo.com\",\"senha\":\"senha-forte-1\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token").value("token-de-teste"))
                .andExpect(jsonPath("$.usuario.nome").value("Ana Lima"))
                .andExpect(content().string(not(containsString("senha-forte-1"))));
    }

    @Test
    void cadastroComSenhaCurtaDevolve400SemChamarOServico() throws Exception {
        mockMvc.perform(post("/auth/cadastro").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nome\":\"Ana\",\"email\":\"ana@exemplo.com\",\"senha\":\"123\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.codigo").value("dados_invalidos"))
                .andExpect(jsonPath("$.mensagem").value("A senha precisa ter de 8 a 72 caracteres."));
        verifyNoInteractions(contaService);
    }

    @Test
    void cadastroComEmailInvalidoDevolve400() throws Exception {
        mockMvc.perform(post("/auth/cadastro").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nome\":\"Ana\",\"email\":\"nao-e-email\",\"senha\":\"senha-forte-1\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensagem").value("Informe um e-mail válido."));
    }

    @Test
    void cadastroComEmailRepetidoDevolve409() throws Exception {
        when(contaService.cadastrar(any())).thenThrow(
                new ContaException(HttpStatus.CONFLICT, "email_ja_cadastrado", "Já existe uma conta com esse e-mail."));

        mockMvc.perform(post("/auth/cadastro").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nome\":\"Ana\",\"email\":\"ana@exemplo.com\",\"senha\":\"senha-forte-1\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.codigo").value("email_ja_cadastrado"));
    }

    @Test
    void loginComCredenciaisErradasDevolve401() throws Exception {
        when(contaService.entrar(any())).thenThrow(
                new ContaException(HttpStatus.UNAUTHORIZED, "credenciais_invalidas", "E-mail ou senha incorretos."));

        mockMvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"ana@exemplo.com\",\"senha\":\"errada-123\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.mensagem").value("E-mail ou senha incorretos."));
    }

    @Test
    void euSemTokenDevolve401() throws Exception {
        when(contaService.exigirUsuario(null)).thenThrow(ContaException.naoAutenticado());

        mockMvc.perform(get("/auth/eu"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.codigo").value("nao_autenticado"));
    }

    @Test
    void euComTokenDevolveOUsuario() throws Exception {
        when(contaService.exigirUsuario("Bearer token-de-teste")).thenReturn(new Usuario(7, "Ana Lima", "ana@exemplo.com"));

        mockMvc.perform(get("/auth/eu").header("Authorization", "Bearer token-de-teste"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("ana@exemplo.com"))
                .andExpect(jsonPath("$.id").doesNotExist());
    }

    @Test
    void sairDevolve204() throws Exception {
        mockMvc.perform(post("/auth/sair").header("Authorization", "Bearer token-de-teste"))
                .andExpect(status().isNoContent());
        verify(contaService).sair("Bearer token-de-teste");
    }

    // ---------- Direitos do titular (LGPD) ----------

    private static final Usuario ANA = new Usuario(7, "Ana Lima", "ana@exemplo.com");

    @Test
    void corrigirONomeExigeLoginEValidaOTamanho() throws Exception {
        when(contaService.exigirUsuario("Bearer t")).thenReturn(ANA);
        when(contaService.atualizarNome(ANA, "Ana Souza")).thenReturn(new UsuarioResposta("Ana Souza", "ana@exemplo.com"));

        mockMvc.perform(put("/auth/eu").header("Authorization", "Bearer t").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nome\":\"Ana Souza\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nome").value("Ana Souza"));

        mockMvc.perform(put("/auth/eu").header("Authorization", "Bearer t").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nome\":\"" + "a".repeat(121) + "\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensagem").value("O nome pode ter até 120 caracteres."));
    }

    @Test
    void meusDadosVemComoAnexoSemCache() throws Exception {
        when(contaService.exigirUsuario("Bearer t")).thenReturn(ANA);
        when(contaService.exportar(ANA)).thenReturn(new ContaDtos.MeusDados(java.time.Instant.parse("2026-11-21T12:00:00Z"),
                new ContaDtos.DadosDaConta("Ana Lima", "ana@exemplo.com", java.time.Instant.parse("2026-11-01T12:00:00Z")),
                java.util.List.of(), java.util.List.of(), java.util.List.of()));

        mockMvc.perform(get("/auth/meus-dados").header("Authorization", "Bearer t"))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(header().string("Content-Disposition", containsString("meus-dados-kyr.json")))
                .andExpect(jsonPath("$.conta.email").value("ana@exemplo.com"));
    }

    @Test
    void meusDadosSemLoginDevolve401() throws Exception {
        when(contaService.exigirUsuario(null)).thenThrow(ContaException.naoAutenticado());

        mockMvc.perform(get("/auth/meus-dados")).andExpect(status().isUnauthorized());
    }

    @Test
    void excluirContaExigeSenhaEDevolve204() throws Exception {
        when(contaService.exigirUsuario("Bearer t")).thenReturn(ANA);

        mockMvc.perform(delete("/auth/conta").header("Authorization", "Bearer t").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"senha\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensagem").value("Informe a sua senha para confirmar."));

        mockMvc.perform(delete("/auth/conta").header("Authorization", "Bearer t").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"senha\":\"senha-certa-123\"}"))
                .andExpect(status().isNoContent());
        verify(contaService).excluirConta(ANA, "senha-certa-123");
    }

    @Test
    void excluirContaComSenhaErradaEntraNoLimiteDoLogin() throws Exception {
        when(contaService.exigirUsuario("Bearer t")).thenReturn(ANA);
        org.mockito.Mockito.doThrow(new ContaException(HttpStatus.FORBIDDEN, "senha_incorreta", "Senha incorreta."))
                .when(contaService).excluirConta(any(), any());

        for (int i = 0; i < 5; i++) {
            mockMvc.perform(delete("/auth/conta").header("Authorization", "Bearer t").contentType(MediaType.APPLICATION_JSON)
                            .content("{\"senha\":\"errada-123\"}"))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.codigo").value("senha_incorreta"));
        }
        mockMvc.perform(delete("/auth/conta").header("Authorization", "Bearer t").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"senha\":\"errada-123\"}"))
                .andExpect(status().isTooManyRequests());
        // O login da mesma conta também fica bloqueado: a rota não serve para contornar o limite.
        entrar("{\"email\":\"ana@exemplo.com\",\"senha\":\"qualquer-123\"}", "203.0.113.1")
                .andExpect(status().isTooManyRequests());
        verify(contaService, times(5)).excluirConta(any(), any());
    }
}

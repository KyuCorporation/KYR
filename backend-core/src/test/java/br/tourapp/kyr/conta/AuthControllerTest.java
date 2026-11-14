package br.tourapp.kyr.conta;

import br.tourapp.kyr.conta.ContaDtos.SessaoResposta;
import br.tourapp.kyr.conta.ContaDtos.Usuario;
import br.tourapp.kyr.conta.ContaDtos.UsuarioResposta;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AuthController.class)
@AutoConfigureMockMvc(addFilters = false)
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ContaService contaService;

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
}

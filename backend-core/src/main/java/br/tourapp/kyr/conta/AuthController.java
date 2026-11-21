package br.tourapp.kyr.conta;

import br.tourapp.kyr.conta.ContaDtos.AtualizarNomeRequest;
import br.tourapp.kyr.conta.ContaDtos.CadastroRequest;
import br.tourapp.kyr.conta.ContaDtos.ExcluirContaRequest;
import br.tourapp.kyr.conta.ContaDtos.LoginRequest;
import br.tourapp.kyr.conta.ContaDtos.MeusDados;
import br.tourapp.kyr.conta.ContaDtos.SessaoResposta;
import br.tourapp.kyr.conta.ContaDtos.Usuario;
import br.tourapp.kyr.conta.ContaDtos.UsuarioResposta;
import br.tourapp.kyr.conta.LimiteDeTentativas.Regra;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final ContaService contaService;
    private final LimiteDeTentativas limites;

    public AuthController(ContaService contaService, LimiteDeTentativas limites) {
        this.contaService = contaService;
        this.limites = limites;
    }

    // Toda tentativa de cadastro conta, inclusive com e-mail repetido: isso também limita quem tenta
    // descobrir, pelo cadastro, quais e-mails já têm conta.
    @PostMapping("/cadastro")
    public ResponseEntity<SessaoResposta> cadastrar(@Valid @RequestBody CadastroRequest pedido, HttpServletRequest requisicao) {
        limites.consumir(Regra.CADASTRO_POR_IP, IpDoCliente.de(requisicao));
        return ResponseEntity.status(HttpStatus.CREATED).body(contaService.cadastrar(pedido));
    }

    // A tentativa é contada antes de conferir a senha e devolvida se o login der certo. Assim só as
    // falhas ficam contando, e requisições simultâneas não escapam do limite.
    @PostMapping("/login")
    public SessaoResposta entrar(@Valid @RequestBody LoginRequest pedido, HttpServletRequest requisicao) {
        String ip = IpDoCliente.de(requisicao);
        String email = ContaService.normalizarEmail(pedido.email());
        limites.consumir(Regra.LOGIN_POR_IP, ip);
        try {
            limites.consumir(Regra.LOGIN_POR_EMAIL, email);
        } catch (MuitasTentativasException e) {
            limites.devolver(Regra.LOGIN_POR_IP, ip);
            throw e;
        }

        SessaoResposta sessao = contaService.entrar(pedido);
        limites.esquecer(Regra.LOGIN_POR_EMAIL, email);
        limites.devolver(Regra.LOGIN_POR_IP, ip);
        return sessao;
    }

    @PostMapping("/sair")
    public ResponseEntity<Void> sair(@RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization) {
        contaService.sair(authorization);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/eu")
    public UsuarioResposta eu(@RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization) {
        Usuario usuario = contaService.exigirUsuario(authorization);
        return new UsuarioResposta(usuario.nome(), usuario.email());
    }

    // ---------- Direitos do titular (LGPD, art. 18) ----------

    @PutMapping("/eu")
    public UsuarioResposta atualizarNome(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @Valid @RequestBody AtualizarNomeRequest pedido) {
        return contaService.atualizarNome(contaService.exigirUsuario(authorization), pedido.nome());
    }

    @GetMapping("/meus-dados")
    public ResponseEntity<MeusDados> meusDados(@RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization) {
        MeusDados dados = contaService.exportar(contaService.exigirUsuario(authorization));
        return ResponseEntity.ok()
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"meus-dados-kyr.json\"")
                .body(dados);
    }

    // Exige a senha, além da sessão: quem pegar um aparelho com a conta aberta não consegue apagá-la.
    // A conferência usa o mesmo limite do login, para esta rota não servir para testar senhas.
    @DeleteMapping("/conta")
    public ResponseEntity<Void> excluirConta(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @Valid @RequestBody ExcluirContaRequest pedido) {
        Usuario usuario = contaService.exigirUsuario(authorization);
        limites.consumir(Regra.LOGIN_POR_EMAIL, usuario.email());
        contaService.excluirConta(usuario, pedido.senha());
        limites.esquecer(Regra.LOGIN_POR_EMAIL, usuario.email());
        return ResponseEntity.noContent().build();
    }
}

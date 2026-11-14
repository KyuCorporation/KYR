package br.tourapp.kyr.conta;

import br.tourapp.kyr.conta.ContaDtos.CadastroRequest;
import br.tourapp.kyr.conta.ContaDtos.LoginRequest;
import br.tourapp.kyr.conta.ContaDtos.SessaoResposta;
import br.tourapp.kyr.conta.ContaDtos.Usuario;
import br.tourapp.kyr.conta.ContaDtos.UsuarioResposta;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final ContaService contaService;

    public AuthController(ContaService contaService) {
        this.contaService = contaService;
    }

    @PostMapping("/cadastro")
    public ResponseEntity<SessaoResposta> cadastrar(@Valid @RequestBody CadastroRequest pedido) {
        return ResponseEntity.status(HttpStatus.CREATED).body(contaService.cadastrar(pedido));
    }

    @PostMapping("/login")
    public SessaoResposta entrar(@Valid @RequestBody LoginRequest pedido) {
        return contaService.entrar(pedido);
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
}

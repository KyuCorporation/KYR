package br.tourapp.kyr.conta;

import br.tourapp.kyr.conta.ContaDtos.CadastroRequest;
import br.tourapp.kyr.conta.ContaDtos.LoginRequest;
import br.tourapp.kyr.conta.ContaDtos.SessaoResposta;
import br.tourapp.kyr.conta.ContaDtos.Usuario;
import br.tourapp.kyr.conta.ContaDtos.UsuarioResposta;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Optional;

// Cadastro, login e sessões. A senha é guardada com BCrypt; o token da sessão é aleatório (256 bits)
// e o banco guarda só o SHA-256 dele, então um vazamento da tabela não entrega sessões válidas.
@Service
public class ContaService {

    static final Duration VALIDADE_DA_SESSAO = Duration.ofDays(30);
    private static final String PREFIXO_BEARER = "Bearer ";

    private final JdbcClient jdbc;
    private final PasswordEncoder senhas;
    private final SecureRandom aleatorio = new SecureRandom();
    // Conferido quando o e-mail não existe, para o login levar o mesmo tempo com e sem conta.
    private final String hashFicticio;

    @Autowired
    public ContaService(JdbcClient jdbc) {
        this(jdbc, new BCryptPasswordEncoder());
    }

    ContaService(JdbcClient jdbc, PasswordEncoder senhas) {
        this.jdbc = jdbc;
        this.senhas = senhas;
        this.hashFicticio = senhas.encode("senha-ficticia-para-tempo-constante");
    }

    public SessaoResposta cadastrar(CadastroRequest pedido) {
        String email = normalizarEmail(pedido.email());
        String nome = pedido.nome().trim();
        long id;
        try {
            id = jdbc.sql("insert into usuario (nome, email, senha_hash) values (:nome, :email, :senha) returning id")
                    .param("nome", nome)
                    .param("email", email)
                    .param("senha", senhas.encode(pedido.senha()))
                    .query(Long.class)
                    .single();
        } catch (DuplicateKeyException e) {
            throw new ContaException(HttpStatus.CONFLICT, "email_ja_cadastrado", "Já existe uma conta com esse e-mail.");
        }
        return abrirSessao(new Usuario(id, nome, email));
    }

    public SessaoResposta entrar(LoginRequest pedido) {
        String email = normalizarEmail(pedido.email());
        Optional<UsuarioComSenha> encontrado = jdbc
                .sql("select id, nome, email, senha_hash from usuario where email = :email")
                .param("email", email)
                .query((rs, n) -> new UsuarioComSenha(
                        new Usuario(rs.getLong("id"), rs.getString("nome"), rs.getString("email")), rs.getString("senha_hash")))
                .optional();

        // Mesma mensagem e mesmo trabalho (uma conferência BCrypt) para e-mail inexistente e senha errada,
        // para não revelar quem tem conta nem pelo texto nem pelo tempo de resposta.
        String hash = encontrado.map(UsuarioComSenha::senhaHash).orElse(hashFicticio);
        boolean senhaConfere = senhas.matches(pedido.senha(), hash);
        if (encontrado.isEmpty() || !senhaConfere) {
            throw new ContaException(HttpStatus.UNAUTHORIZED, "credenciais_invalidas", "E-mail ou senha incorretos.");
        }
        return abrirSessao(encontrado.get().usuario());
    }

    public void sair(String cabecalhoAuthorization) {
        extrairToken(cabecalhoAuthorization).ifPresent(token ->
                jdbc.sql("delete from sessao where token_hash = :hash").param("hash", sha256(token)).update());
    }

    // Usuário dono do token enviado em "Authorization: Bearer <token>", ou 401.
    public Usuario exigirUsuario(String cabecalhoAuthorization) {
        String token = extrairToken(cabecalhoAuthorization).orElseThrow(ContaException::naoAutenticado);
        return jdbc.sql("""
                        select u.id, u.nome, u.email
                          from sessao s join usuario u on u.id = s.usuario_id
                         where s.token_hash = :hash and s.expira_em > now()
                        """)
                .param("hash", sha256(token))
                .query((rs, n) -> new Usuario(rs.getLong("id"), rs.getString("nome"), rs.getString("email")))
                .optional()
                .orElseThrow(ContaException::naoAutenticado);
    }

    private SessaoResposta abrirSessao(Usuario usuario) {
        byte[] bytes = new byte[32];
        aleatorio.nextBytes(bytes);
        String token = HexFormat.of().formatHex(bytes);

        jdbc.sql("delete from sessao where expira_em <= now()").update();
        jdbc.sql("insert into sessao (token_hash, usuario_id, expira_em) values (:hash, :usuario, :expira)")
                .param("hash", sha256(token))
                .param("usuario", usuario.id())
                .param("expira", Timestamp.from(Instant.now().plus(VALIDADE_DA_SESSAO)))
                .update();

        return new SessaoResposta(token, new UsuarioResposta(usuario.nome(), usuario.email()));
    }

    private Optional<String> extrairToken(String cabecalho) {
        if (cabecalho == null || !cabecalho.startsWith(PREFIXO_BEARER)) {
            return Optional.empty();
        }
        String token = cabecalho.substring(PREFIXO_BEARER.length()).trim();
        return token.isEmpty() ? Optional.empty() : Optional.of(token);
    }

    static String normalizarEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    static String sha256(String valor) {
        try {
            byte[] hash = MessageDigest.getInstance("SHA-256").digest(valor.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 indisponível", e);
        }
    }

    private record UsuarioComSenha(Usuario usuario, String senhaHash) {
    }
}

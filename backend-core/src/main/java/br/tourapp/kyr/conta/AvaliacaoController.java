package br.tourapp.kyr.conta;

import br.tourapp.kyr.conta.ContaDtos.AvaliacaoRequest;
import br.tourapp.kyr.conta.ContaDtos.AvaliacaoResposta;
import br.tourapp.kyr.conta.ContaDtos.AvaliacoesResposta;
import br.tourapp.kyr.conta.ContaDtos.Usuario;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

// Avaliações dos destinos do catálogo do KYR, escritas por quem tem conta. Não são avaliações do Google.
// Ler é público; escrever exige login. Cada pessoa tem uma avaliação por destino (enviar de novo substitui).
@RestController
@RequestMapping("/destinos/{slug}/avaliacoes")
public class AvaliacaoController {

    private static final Pattern SLUG = Pattern.compile("[a-z0-9-]{1,120}");

    private final ContaService contaService;
    private final JdbcClient jdbc;
    // Slugs do catálogo do frontend (frontend/src/core/destinos.ts). Vazio aceita qualquer slug bem formado.
    private final Set<String> destinosDoCatalogo;

    public AvaliacaoController(ContaService contaService, JdbcClient jdbc) {
        this(contaService, jdbc, "");
    }

    @Autowired
    public AvaliacaoController(ContaService contaService, JdbcClient jdbc,
                               @Value("${avaliacoes.destinos:}") String destinosDoCatalogo) {
        this.contaService = contaService;
        this.jdbc = jdbc;
        this.destinosDoCatalogo = Arrays.stream(destinosDoCatalogo.split(","))
                .map(String::strip)
                .filter(slug -> !slug.isEmpty())
                .collect(Collectors.toUnmodifiableSet());
    }

    @GetMapping
    public AvaliacoesResposta listar(@PathVariable String slug) {
        validarSlug(slug);
        List<AvaliacaoResposta> avaliacoes = jdbc.sql("""
                        select u.nome, a.nota, a.comentario, a.criado_em
                          from avaliacao_destino a join usuario u on u.id = a.usuario_id
                         where a.destino_slug = :slug
                         order by a.criado_em desc
                         limit 50
                        """)
                .param("slug", slug)
                .query((rs, n) -> new AvaliacaoResposta(primeiroNome(rs.getString("nome")), rs.getInt("nota"),
                        rs.getString("comentario"), rs.getTimestamp("criado_em").toInstant()))
                .list();

        Resumo resumo = jdbc.sql("select avg(nota)::float8 as media, count(*) as total from avaliacao_destino where destino_slug = :slug")
                .param("slug", slug)
                .query((rs, n) -> new Resumo(rs.getObject("media", Double.class), rs.getInt("total")))
                .single();
        return new AvaliacoesResposta(resumo.media(), resumo.total(), avaliacoes);
    }

    @PutMapping
    public AvaliacoesResposta avaliar(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @PathVariable String slug,
            @Valid @RequestBody AvaliacaoRequest pedido) {
        validarSlug(slug);
        Usuario usuario = contaService.exigirUsuario(authorization);
        jdbc.sql("""
                        insert into avaliacao_destino (usuario_id, destino_slug, nota, comentario)
                        values (:usuario, :slug, :nota, :comentario)
                        on conflict (usuario_id, destino_slug)
                        do update set nota = excluded.nota, comentario = excluded.comentario, criado_em = now()
                        """)
                .param("usuario", usuario.id())
                .param("slug", slug)
                .param("nota", pedido.nota())
                .param("comentario", pedido.comentario() == null ? "" : pedido.comentario().trim())
                .update();
        return listar(slug);
    }

    private void validarSlug(String slug) {
        boolean foraDoCatalogo = !destinosDoCatalogo.isEmpty() && !destinosDoCatalogo.contains(slug);
        if (!SLUG.matcher(slug).matches() || foraDoCatalogo) {
            throw new ContaException(HttpStatus.NOT_FOUND, "destino_nao_encontrado", "Destino não encontrado.");
        }
    }

    // Só o primeiro nome aparece para os outros usuários.
    private static String primeiroNome(String nome) {
        String limpo = nome == null ? "" : nome.trim();
        int espaco = limpo.indexOf(' ');
        return espaco > 0 ? limpo.substring(0, espaco) : limpo;
    }

    private record Resumo(Double media, int total) {
    }
}

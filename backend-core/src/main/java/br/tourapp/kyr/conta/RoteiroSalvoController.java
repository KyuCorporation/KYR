package br.tourapp.kyr.conta;

import br.tourapp.kyr.conta.ContaDtos.LocalResposta;
import br.tourapp.kyr.conta.ContaDtos.RoteiroSalvoResposta;
import br.tourapp.kyr.conta.ContaDtos.SalvarRoteiroRequest;
import br.tourapp.kyr.conta.ContaDtos.Usuario;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Arrays;
import java.util.List;

// Roteiros salvos na conta. Guarda o que a pessoa escolheu (origem e destino) e os IDs dos lugares
// sugeridos; nomes, endereços e notas dos lugares do Google não são gravados (termos da Places API).
// Para reabrir, o frontend gera o roteiro de novo com a mesma origem e o mesmo destino.
@RestController
@RequestMapping("/roteiros-salvos")
public class RoteiroSalvoController {

    private static final String COLUNAS = """
            id, origem_nome, origem_latitude, origem_longitude,
            destino_nome, destino_latitude, destino_longitude, total_pontos, place_ids, criado_em
            """;

    private final ContaService contaService;
    private final JdbcClient jdbc;

    public RoteiroSalvoController(ContaService contaService, JdbcClient jdbc) {
        this.contaService = contaService;
        this.jdbc = jdbc;
    }

    @GetMapping
    public List<RoteiroSalvoResposta> listar(@RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization) {
        Usuario usuario = contaService.exigirUsuario(authorization);
        return jdbc.sql("select " + COLUNAS + " from roteiro_salvo where usuario_id = :usuario order by criado_em desc limit 100")
                .param("usuario", usuario.id())
                .query(RoteiroSalvoController::paraResposta)
                .list();
    }

    @PostMapping
    public ResponseEntity<RoteiroSalvoResposta> salvar(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @Valid @RequestBody SalvarRoteiroRequest pedido) {
        Usuario usuario = contaService.exigirUsuario(authorization);
        List<String> placeIds = pedido.placeIds() == null ? List.of() : pedido.placeIds().stream()
                .filter(id -> id != null && !id.isBlank() && !id.contains(","))
                .toList();

        RoteiroSalvoResposta salvo = jdbc.sql("""
                        insert into roteiro_salvo (usuario_id, origem_nome, origem_latitude, origem_longitude,
                                                   destino_nome, destino_latitude, destino_longitude, total_pontos, place_ids)
                        values (:usuario, :origemNome, :origemLat, :origemLng, :destinoNome, :destinoLat, :destinoLng, :total, :placeIds)
                        returning
                        """ + COLUNAS)
                .param("usuario", usuario.id())
                .param("origemNome", pedido.origem().nome().trim())
                .param("origemLat", pedido.origem().latitude())
                .param("origemLng", pedido.origem().longitude())
                .param("destinoNome", pedido.destino().nome().trim())
                .param("destinoLat", pedido.destino().latitude())
                .param("destinoLng", pedido.destino().longitude())
                .param("total", placeIds.size())
                .param("placeIds", String.join(",", placeIds))
                .query(RoteiroSalvoController::paraResposta)
                .single();
        return ResponseEntity.status(HttpStatus.CREATED).body(salvo);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> remover(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @PathVariable long id) {
        Usuario usuario = contaService.exigirUsuario(authorization);
        int removidos = jdbc.sql("delete from roteiro_salvo where id = :id and usuario_id = :usuario")
                .param("id", id)
                .param("usuario", usuario.id())
                .update();
        if (removidos == 0) {
            throw new ContaException(HttpStatus.NOT_FOUND, "roteiro_nao_encontrado", "Roteiro não encontrado.");
        }
        return ResponseEntity.noContent().build();
    }

    private static RoteiroSalvoResposta paraResposta(ResultSet rs, int linha) throws SQLException {
        LocalResposta origem = new LocalResposta(rs.getString("origem_nome"),
                rs.getObject("origem_latitude", Double.class), rs.getObject("origem_longitude", Double.class));
        LocalResposta destino = new LocalResposta(rs.getString("destino_nome"),
                rs.getObject("destino_latitude", Double.class), rs.getObject("destino_longitude", Double.class));
        String placeIds = rs.getString("place_ids");
        boolean podeReabrir = origem.latitude() != null && origem.longitude() != null
                && destino.latitude() != null && destino.longitude() != null;
        return new RoteiroSalvoResposta(rs.getLong("id"), origem, destino, rs.getInt("total_pontos"),
                placeIds == null || placeIds.isBlank() ? List.of() : Arrays.asList(placeIds.split(",")),
                rs.getTimestamp("criado_em").toInstant(), podeReabrir);
    }
}

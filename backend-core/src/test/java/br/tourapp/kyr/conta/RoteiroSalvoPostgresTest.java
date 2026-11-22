package br.tourapp.kyr.conta;

import br.tourapp.kyr.PostgresDeTeste;
import br.tourapp.kyr.conta.ContaDtos.LocalRequest;
import br.tourapp.kyr.conta.ContaDtos.RoteiroSalvoResposta;
import br.tourapp.kyr.conta.ContaDtos.SalvarRoteiroRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.Arrays;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

// Roteiros salvos contra o Postgres real: o que é gravado, a listagem por conta e a remoção só pelo dono.
@Testcontainers(disabledWithoutDocker = true)
class RoteiroSalvoPostgresTest extends PostgresDeTeste {

    private RoteiroSalvoController roteiros;
    private String ana;
    private String bruno;

    @BeforeEach
    void preparar() {
        ContaService contas = new ContaService(jdbc);
        roteiros = new RoteiroSalvoController(contas, jdbc);
        ana = cadastrar(contas, "Ana Viajante", "ana@exemplo.com");
        bruno = cadastrar(contas, "Bruno Lima", "bruno@exemplo.com");
    }

    private static SalvarRoteiroRequest pedido(String origem, String destino, List<String> placeIds) {
        return new SalvarRoteiroRequest(
                new LocalRequest(origem, -25.59, -54.49), new LocalRequest(destino, -25.54, -54.58), placeIds);
    }

    private RoteiroSalvoResposta salvar(String sessao, String origem) {
        return roteiros.salvar(sessao, pedido(origem, "Centro", List.of("place-a"))).getBody();
    }

    @Test
    void guardaSoIdsValidosENomesSemEspacosNasPontas() {
        var resposta = roteiros.salvar(ana, pedido("  Aeroporto  ", "Centro",
                Arrays.asList("place-a", null, "  ", "place-b,place-c", "place-d")));

        assertThat(resposta.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        RoteiroSalvoResposta salvo = resposta.getBody();
        assertThat(salvo.origem().nome()).isEqualTo("Aeroporto");
        assertThat(salvo.placeIds()).containsExactly("place-a", "place-d");
        assertThat(salvo.totalPontos()).isEqualTo(2);
        assertThat(salvo.podeReabrir()).isTrue();
    }

    @Test
    void salvaSemLugaresQuandoAListaNaoVem() {
        RoteiroSalvoResposta salvo = roteiros.salvar(ana, pedido("Aeroporto", "Centro", null)).getBody();

        assertThat(salvo.placeIds()).isEmpty();
        assertThat(salvo.totalPontos()).isZero();
    }

    @Test
    void listaSoOsRoteirosDaPropriaContaDoMaisRecenteAoMaisAntigo() {
        salvar(ana, "Primeiro da Ana");
        salvar(bruno, "Do Bruno");
        salvar(ana, "Segundo da Ana");

        assertThat(roteiros.listar(ana)).extracting(r -> r.origem().nome())
                .containsExactly("Segundo da Ana", "Primeiro da Ana");
        assertThat(roteiros.listar(bruno)).extracting(r -> r.origem().nome()).containsExactly("Do Bruno");
    }

    @Test
    void naoRemoveRoteiroDeOutraConta() {
        long idDaAna = salvar(ana, "Aeroporto").id();

        assertThatThrownBy(() -> roteiros.remover(bruno, idDaAna))
                .isInstanceOfSatisfying(ContaException.class, e -> {
                    assertThat(e.status()).isEqualTo(HttpStatus.NOT_FOUND);
                    assertThat(e.codigo()).isEqualTo("roteiro_nao_encontrado");
                });
        assertThat(roteiros.listar(ana)).hasSize(1);
    }

    @Test
    void removeOProprioRoteiro() {
        long id = salvar(ana, "Aeroporto").id();

        assertThat(roteiros.remover(ana, id).getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(roteiros.listar(ana)).isEmpty();
        assertThatThrownBy(() -> roteiros.remover(ana, id)).isInstanceOf(ContaException.class);
    }

    @Test
    void semSessaoValidaRecusaComNaoAutenticado() {
        for (String sessao : new String[] {null, "Bearer token-inventado", "Basic abc"}) {
            assertThatThrownBy(() -> roteiros.listar(sessao))
                    .isInstanceOfSatisfying(ContaException.class, e -> assertThat(e.status()).isEqualTo(HttpStatus.UNAUTHORIZED));
        }
    }

    @Test
    void semCoordenadasORoteiroContinuaNaListaMasNaoPodeSerReaberto() {
        salvar(ana, "Aeroporto");
        jdbc.sql("update roteiro_salvo set origem_latitude = null, origem_longitude = null").update();

        RoteiroSalvoResposta lido = roteiros.listar(ana).getFirst();
        assertThat(lido.origem().latitude()).isNull();
        assertThat(lido.destino().latitude()).isNotNull();
        assertThat(lido.podeReabrir()).isFalse();
    }
}

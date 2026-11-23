package br.tourapp.kyr.conta;

import br.tourapp.kyr.PostgresDeTeste;
import br.tourapp.kyr.conta.ContaDtos.AvaliacaoRequest;
import br.tourapp.kyr.conta.ContaDtos.AvaliacoesResposta;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

// Avaliações dos destinos do catálogo contra o Postgres real.
@Testcontainers(disabledWithoutDocker = true)
class AvaliacaoPostgresTest extends PostgresDeTeste {

    private AvaliacaoController avaliacoes;
    private ContaService contas;

    @BeforeEach
    void preparar() {
        contas = new ContaService(jdbc);
        avaliacoes = new AvaliacaoController(contas, jdbc);
    }

    @Test
    void destinoSemAvaliacoesTemMediaNulaETotalZero() {
        AvaliacoesResposta resposta = avaliacoes.listar("parque-das-aves");

        assertThat(resposta.media()).isNull();
        assertThat(resposta.total()).isZero();
        assertThat(resposta.avaliacoes()).isEmpty();
    }

    @Test
    void calculaAMediaEMostraSoOPrimeiroNomeDoAutor() {
        String ana = cadastrar(contas, "Ana Maria Viajante", "ana@exemplo.com");
        String bruno = cadastrar(contas, "Bruno", "bruno@exemplo.com");

        avaliacoes.avaliar(ana, "parque-das-aves", new AvaliacaoRequest(5, "  Lindo  "));
        AvaliacoesResposta resposta = avaliacoes.avaliar(bruno, "parque-das-aves", new AvaliacaoRequest(2, null));

        assertThat(resposta.total()).isEqualTo(2);
        assertThat(resposta.media()).isEqualTo(3.5);
        assertThat(resposta.avaliacoes()).extracting(a -> a.autor()).containsExactlyInAnyOrder("Ana", "Bruno");
        assertThat(resposta.avaliacoes()).extracting(a -> a.comentario()).containsExactlyInAnyOrder("Lindo", "");
    }

    @Test
    void avaliarDeNovoSubstituiAAvaliacaoAnterior() {
        String ana = cadastrar(contas, "Ana", "ana@exemplo.com");

        avaliacoes.avaliar(ana, "parque-das-aves", new AvaliacaoRequest(5, "Lindo"));
        AvaliacoesResposta resposta = avaliacoes.avaliar(ana, "parque-das-aves", new AvaliacaoRequest(3, "Lotado"));

        assertThat(resposta.total()).isEqualTo(1);
        assertThat(resposta.media()).isEqualTo(3.0);
        assertThat(resposta.avaliacoes().getFirst().comentario()).isEqualTo("Lotado");
    }

    @Test
    void cadaDestinoTemSuasProprias() {
        String ana = cadastrar(contas, "Ana", "ana@exemplo.com");

        avaliacoes.avaliar(ana, "parque-das-aves", new AvaliacaoRequest(5, ""));

        assertThat(avaliacoes.listar("itaipu-binacional").total()).isZero();
    }

    @Test
    void recusaSlugForaDoPadraoEAvaliacaoSemLogin() {
        assertThatThrownBy(() -> avaliacoes.listar("../auth/eu"))
                .isInstanceOfSatisfying(ContaException.class, e -> assertThat(e.status()).isEqualTo(HttpStatus.NOT_FOUND));
        assertThatThrownBy(() -> avaliacoes.avaliar(null, "parque-das-aves", new AvaliacaoRequest(5, "")))
                .isInstanceOfSatisfying(ContaException.class, e -> assertThat(e.status()).isEqualTo(HttpStatus.UNAUTHORIZED));
    }

    @Test
    void excluirAContaApagaAsAvaliacoesDela() {
        String ana = cadastrar(contas, "Ana", "ana@exemplo.com");
        avaliacoes.avaliar(ana, "parque-das-aves", new AvaliacaoRequest(4, ""));

        contas.excluirConta(contas.exigirUsuario(ana), "senha-certa-123");

        assertThat(avaliacoes.listar("parque-das-aves").total()).isZero();
    }
}

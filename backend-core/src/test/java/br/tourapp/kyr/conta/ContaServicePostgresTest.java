package br.tourapp.kyr.conta;

import br.tourapp.kyr.conta.ContaDtos.CadastroRequest;
import br.tourapp.kyr.conta.ContaDtos.MeusDados;
import br.tourapp.kyr.conta.ContaDtos.Usuario;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

// Direitos do titular contra um Postgres de verdade, com a migration real (exclusão em cascata).
// Precisa de Docker; sem ele, os testes são pulados em vez de falhar.
@Testcontainers(disabledWithoutDocker = true)
class ContaServicePostgresTest {

    @Container
    private static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:15-alpine");

    private static JdbcClient jdbc;
    private ContaService contas;

    @BeforeAll
    static void migrar() {
        Flyway.configure().dataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword()).load().migrate();
        jdbc = JdbcClient.create(new DriverManagerDataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword()));
    }

    @BeforeEach
    void limpar() {
        jdbc.sql("truncate usuario restart identity cascade").update();
        contas = new ContaService(jdbc);
    }

    private Usuario cadastrarComDados(String nome, String email) {
        String token = contas.cadastrar(new CadastroRequest(nome, email, "senha-certa-123")).token();
        Usuario usuario = contas.exigirUsuario("Bearer " + token);
        jdbc.sql("""
                        insert into roteiro_salvo (usuario_id, origem_nome, origem_latitude, origem_longitude,
                                                   destino_nome, destino_latitude, destino_longitude, total_pontos, place_ids)
                        values (:id, 'Aeroporto', -25.59, -54.49, 'Centro', -25.54, -54.58, 2, 'place-a,place-b')
                        """)
                .param("id", usuario.id())
                .update();
        jdbc.sql("insert into avaliacao_destino (usuario_id, destino_slug, nota, comentario) values (:id, 'parque-das-aves', 5, 'Lindo')")
                .param("id", usuario.id())
                .update();
        return usuario;
    }

    private int contar(String tabela, long usuarioId) {
        String coluna = tabela.equals("usuario") ? "id" : "usuario_id";
        return jdbc.sql("select count(*) from " + tabela + " where " + coluna + " = :id").param("id", usuarioId).query(Integer.class).single();
    }

    @Test
    void exportaContaRoteirosAvaliacoesESessoesSemOHashDaSenha() {
        Usuario ana = cadastrarComDados("Ana Viajante", "ana@exemplo.com");

        MeusDados dados = contas.exportar(ana);

        assertThat(dados.conta().nome()).isEqualTo("Ana Viajante");
        assertThat(dados.conta().email()).isEqualTo("ana@exemplo.com");
        assertThat(dados.roteirosSalvos()).singleElement().satisfies(roteiro -> {
            assertThat(roteiro.origem().nome()).isEqualTo("Aeroporto");
            assertThat(roteiro.placeIds()).containsExactly("place-a", "place-b");
        });
        assertThat(dados.avaliacoes()).singleElement().satisfies(avaliacao -> {
            assertThat(avaliacao.destino()).isEqualTo("parque-das-aves");
            assertThat(avaliacao.comentario()).isEqualTo("Lindo");
        });
        assertThat(dados.sessoesAtivasValidasAte()).hasSize(1);

        // O toString dos records lista todos os campos: o hash BCrypt ("$2a$...") não pode aparecer.
        assertThat(dados.toString()).doesNotContain("$2a$").doesNotContain("senha");
    }

    @Test
    void corrigeONome() {
        Usuario ana = cadastrarComDados("Ana Viajante", "ana@exemplo.com");

        contas.atualizarNome(ana, "  Ana Souza ");

        assertThat(contas.exportar(ana).conta().nome()).isEqualTo("Ana Souza");
    }

    @Test
    void comSenhaErradaNaoApagaNada() {
        Usuario ana = cadastrarComDados("Ana Viajante", "ana@exemplo.com");

        assertThatThrownBy(() -> contas.excluirConta(ana, "senha-errada-1"))
                .isInstanceOfSatisfying(ContaException.class, e -> assertThat(e.codigo()).isEqualTo("senha_incorreta"));

        assertThat(contar("usuario", ana.id())).isEqualTo(1);
        assertThat(contar("roteiro_salvo", ana.id())).isEqualTo(1);
    }

    @Test
    void excluirApagaContaSessoesRoteirosEAvaliacoesSoDaPessoa() {
        Usuario ana = cadastrarComDados("Ana Viajante", "ana@exemplo.com");
        Usuario bruno = cadastrarComDados("Bruno Lima", "bruno@exemplo.com");

        contas.excluirConta(ana, "senha-certa-123");

        for (String tabela : new String[] {"usuario", "sessao", "roteiro_salvo", "avaliacao_destino"}) {
            assertThat(contar(tabela, ana.id())).as(tabela + " da Ana").isZero();
            assertThat(contar(tabela, bruno.id())).as(tabela + " do Bruno").isEqualTo(1);
        }
        // O e-mail fica livre para um novo cadastro.
        assertThat(contas.cadastrar(new CadastroRequest("Ana", "ana@exemplo.com", "outra-senha-123")).token()).isNotBlank();
    }
}

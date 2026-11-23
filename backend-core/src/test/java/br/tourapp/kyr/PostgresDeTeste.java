package br.tourapp.kyr;

import br.tourapp.kyr.conta.ContaDtos.CadastroRequest;
import br.tourapp.kyr.conta.ContaService;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.postgresql.PostgreSQLContainer;

// Base dos testes que precisam de um Postgres de verdade (SQL, migração, exclusão em cascata).
// Um único container serve a suíte inteira; cada teste começa com as tabelas vazias.
// As classes filhas usam @Testcontainers(disabledWithoutDocker = true): sem Docker, são puladas.
public abstract class PostgresDeTeste {

    private static PostgreSQLContainer postgres;
    protected static JdbcClient jdbc;

    /** Sobe o container (uma vez) e aplica as migrações do Flyway. */
    public static synchronized PostgreSQLContainer iniciar() {
        if (postgres == null) {
            postgres = new PostgreSQLContainer("postgres:15-alpine");
            postgres.start();
            Flyway.configure()
                    .dataSource(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword())
                    .load()
                    .migrate();
            jdbc = JdbcClient.create(new DriverManagerDataSource(
                    postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword()));
        }
        return postgres;
    }

    @BeforeAll
    static void subirBanco() {
        iniciar();
    }

    @BeforeEach
    void esvaziarTabelas() {
        jdbc.sql("truncate usuario, curadoria_poi restart identity cascade").update();
    }

    /** Cadastra uma conta e devolve o cabeçalho Authorization da sessão aberta. */
    protected static String cadastrar(ContaService contas, String nome, String email) {
        return "Bearer " + contas.cadastrar(new CadastroRequest(nome, email, "senha-certa-123")).token();
    }
}

package br.tourapp.kyr.conta;

import br.tourapp.kyr.conta.ContaDtos.LoginRequest;
import org.junit.jupiter.api.Test;
import org.mockito.Answers;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ContaServiceLoginTest {

    @Test
    @SuppressWarnings("unchecked")
    void emailSemContaTambemPassaPelaConferenciaDaSenha() {
        JdbcClient jdbc = mock(JdbcClient.class, Answers.RETURNS_DEEP_STUBS);
        when(jdbc.sql(anyString()).param(anyString(), any()).query(any(RowMapper.class)).optional()).thenReturn(Optional.empty());
        PasswordEncoder senhas = mock(PasswordEncoder.class);
        when(senhas.encode(anyString())).thenReturn("hash-ficticio");
        ContaService servico = new ContaService(jdbc, senhas);

        assertThatThrownBy(() -> servico.entrar(new LoginRequest("ninguem@exemplo.com", "qualquer-123")))
                .isInstanceOfSatisfying(ContaException.class, e -> assertThat(e.codigo()).isEqualTo("credenciais_invalidas"));

        // Sem essa conferência, o login responderia mais rápido para e-mails sem conta.
        verify(senhas).matches("qualquer-123", "hash-ficticio");
    }

    @Test
    @SuppressWarnings("unchecked")
    void hashFicticioNaoAbreSessaoMesmoQueASenhaConfira() {
        JdbcClient jdbc = mock(JdbcClient.class, Answers.RETURNS_DEEP_STUBS);
        when(jdbc.sql(anyString()).param(anyString(), any()).query(any(RowMapper.class)).optional()).thenReturn(Optional.empty());
        PasswordEncoder senhas = mock(PasswordEncoder.class);
        when(senhas.encode(anyString())).thenReturn("hash-ficticio");
        when(senhas.matches(anyString(), eq("hash-ficticio"))).thenReturn(true);
        ContaService servico = new ContaService(jdbc, senhas);

        assertThatThrownBy(() -> servico.entrar(new LoginRequest("ninguem@exemplo.com", "senha-ficticia-para-tempo-constante")))
                .isInstanceOf(ContaException.class)
                .hasMessage("E-mail ou senha incorretos.");
    }
}

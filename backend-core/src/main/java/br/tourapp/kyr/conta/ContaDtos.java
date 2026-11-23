package br.tourapp.kyr.conta;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;

// Entradas e saídas das rotas de conta, roteiros salvos e avaliações.
public final class ContaDtos {

    private ContaDtos() {
    }

    public record CadastroRequest(
            @NotBlank(message = "Informe o seu nome.") @Size(max = 120, message = "O nome pode ter até 120 caracteres.") String nome,
            @NotBlank(message = "Informe o e-mail.") @Email(message = "Informe um e-mail válido.") @Size(max = 254, message = "E-mail muito longo.") String email,
            @NotBlank(message = "Informe a senha.") @Size(min = 8, max = 72, message = "A senha precisa ter de 8 a 72 caracteres.") String senha) {
    }

    public record LoginRequest(
            @NotBlank(message = "Informe o e-mail.") String email,
            @NotBlank(message = "Informe a senha.") String senha) {
    }

    public record Usuario(long id, String nome, String email) {
    }

    public record UsuarioResposta(String nome, String email) {
    }

    // O token só aparece aqui, na resposta do cadastro e do login.
    public record SessaoResposta(String token, UsuarioResposta usuario) {
    }

    public record LocalRequest(
            @NotBlank(message = "Informe o nome do local.") @Size(max = 300, message = "Nome do local muito longo.") String nome,
            @NotNull(message = "Informe a latitude.") @Min(value = -90, message = "Latitude inválida.") @Max(value = 90, message = "Latitude inválida.") Double latitude,
            @NotNull(message = "Informe a longitude.") @Min(value = -180, message = "Longitude inválida.") @Max(value = 180, message = "Longitude inválida.") Double longitude) {
    }

    public record SalvarRoteiroRequest(
            @NotNull(message = "Informe a origem.") @Valid LocalRequest origem,
            @NotNull(message = "Informe o destino.") @Valid LocalRequest destino,
            @Size(max = 25, message = "Um roteiro tem no máximo 25 pontos.") List<@Size(max = 300) String> placeIds) {
    }

    // latitude e longitude ficam nulas depois de 30 dias (limite dos termos do Google para coordenadas).
    public record LocalResposta(String nome, Double latitude, Double longitude) {
    }

    public record RoteiroSalvoResposta(long id, LocalResposta origem, LocalResposta destino, int totalPontos,
                                       List<String> placeIds, Instant criadoEm, boolean podeReabrir) {
    }

    public record AvaliacaoRequest(
            @NotNull(message = "Informe a nota.") @Min(value = 1, message = "A nota vai de 1 a 5.") @Max(value = 5, message = "A nota vai de 1 a 5.") Integer nota,
            @Size(max = 600, message = "O comentário pode ter até 600 caracteres.") String comentario) {
    }

    public record AvaliacaoResposta(String autor, int nota, String comentario, Instant criadoEm) {
    }

    public record AvaliacoesResposta(Double media, int total, List<AvaliacaoResposta> avaliacoes) {
    }

    // ---------- Direitos do titular (LGPD, art. 18) ----------

    public record AtualizarNomeRequest(
            @NotBlank(message = "Informe o seu nome.") @Size(max = 120, message = "O nome pode ter até 120 caracteres.") String nome) {
    }

    public record ExcluirContaRequest(@NotBlank(message = "Informe a sua senha para confirmar.") String senha) {
    }

    public record DadosDaConta(String nome, String email, Instant criadaEm) {
    }

    public record AvaliacaoExportada(String destino, int nota, String comentario, Instant criadaEm) {
    }

    // Tudo o que o servidor guarda sobre a pessoa, para o acesso e a portabilidade dos dados.
    // A senha não aparece (só existe o hash) e as sessões aparecem só pela data de validade.
    public record MeusDados(Instant geradoEm, DadosDaConta conta, List<RoteiroSalvoResposta> roteirosSalvos,
                            List<AvaliacaoExportada> avaliacoes, List<Instant> sessoesAtivasValidasAte) {
    }
}

package br.tourapp.kyr.conta;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

// Limita tentativas de login e de cadastro em memória, por janela fixa de tempo.
// A tentativa é contada antes de chamar o serviço (consumir), e não depois da falha: assim, várias
// requisições simultâneas não passam todas antes de a primeira falha ser registrada. Quando o login dá
// certo, a tentativa é devolvida. Os contadores ficam só nesta instância e zeram se a aplicação reiniciar.
@Component
public class LimiteDeTentativas {

    public enum Regra {
        // Protege uma conta contra força bruta, venha de onde vier a tentativa.
        LOGIN_POR_EMAIL(5, Duration.ofMinutes(15)),
        // Protege contra o mesmo cliente testar senhas em muitas contas. Folgado porque várias pessoas
        // podem sair pelo mesmo IP (a rede de um evento, por exemplo).
        LOGIN_POR_IP(30, Duration.ofMinutes(15)),
        CADASTRO_POR_IP(10, Duration.ofHours(1));

        private final int maximo;
        private final Duration janela;

        Regra(int maximo, Duration janela) {
            this.maximo = maximo;
            this.janela = janela;
        }

        public int maximo() {
            return maximo;
        }

        public Duration janela() {
            return janela;
        }
    }

    private record Janela(Duration duracao, Instant inicio, int tentativas) {
        Instant fim() {
            return inicio.plus(duracao);
        }

        boolean vencida(Instant agora) {
            return !agora.isBefore(fim());
        }
    }

    private final Map<String, Janela> janelas = new ConcurrentHashMap<>();
    private final Clock relogio;

    // Com dois construtores, o Spring usa este, sem argumentos.
    public LimiteDeTentativas() {
        this(Clock.systemUTC());
    }

    LimiteDeTentativas(Clock relogio) {
        this.relogio = relogio;
    }

    /** Conta uma tentativa ou, se o limite da janela já foi atingido, recusa com 429. */
    public void consumir(Regra regra, String chave) {
        consumir(regra.name(), chave, regra.maximo(), regra.janela(), null);
    }

    /**
     * Mesma conta, para limites definidos fora do enum (por configuração). {@code mensagem} é o início do
     * texto de erro; sem ela, vale "Muitas tentativas.".
     */
    public void consumir(String nome, String chave, int maximo, Duration duracao, String mensagem) {
        Instant agora = relogio.instant();
        boolean[] recusada = {false};
        Janela atual = janelas.compute(id(nome, chave), (id, janela) -> {
            if (janela == null || janela.vencida(agora)) {
                return new Janela(duracao, agora, 1);
            }
            if (janela.tentativas() >= maximo) {
                recusada[0] = true;
                return janela;
            }
            return new Janela(janela.duracao(), janela.inicio(), janela.tentativas() + 1);
        });
        if (recusada[0]) {
            Duration espera = Duration.between(agora, atual.fim());
            throw mensagem == null ? new MuitasTentativasException(espera) : new MuitasTentativasException(espera, mensagem);
        }
    }

    /** Desconta uma tentativa que deu certo. */
    public void devolver(Regra regra, String chave) {
        devolver(regra.name(), chave);
    }

    public void devolver(String nome, String chave) {
        janelas.computeIfPresent(id(nome, chave), (id, janela) ->
                janela.tentativas() <= 1 ? null : new Janela(janela.duracao(), janela.inicio(), janela.tentativas() - 1));
    }

    /** Zera o contador da chave, por exemplo depois de um login certo. */
    public void esquecer(Regra regra, String chave) {
        janelas.remove(id(regra.name(), chave));
    }

    @Scheduled(fixedDelay = 10, timeUnit = TimeUnit.MINUTES)
    void descartarVencidas() {
        Instant agora = relogio.instant();
        janelas.values().removeIf(janela -> janela.vencida(agora));
    }

    int quantidadeDeChaves() {
        return janelas.size();
    }

    void esquecerTudo() {
        janelas.clear();
    }

    private static String id(String nome, String chave) {
        return nome + "|" + chave;
    }
}

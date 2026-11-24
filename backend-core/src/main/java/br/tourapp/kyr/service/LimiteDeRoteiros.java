package br.tourapp.kyr.service;

import br.tourapp.kyr.conta.IpDoCliente;
import br.tourapp.kyr.conta.LimiteDeTentativas;
import br.tourapp.kyr.conta.MuitasTentativasException;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Duration;

// Cada roteiro faz até 8 buscas no Places e 2 consultas de rota, que são cobradas pelo Google, além de uma
// chamada a um provedor de LLM. Como as rotas são públicas, este limite protege a cota: um teto por IP
// (contra um cliente que repete pedidos) e um teto diário para o serviço inteiro (que vale mesmo se os
// pedidos vierem de muitos IPs). Um valor 0 ou negativo desliga o teto correspondente.
// Os contadores ficam na memória desta instância e zeram se a aplicação reiniciar.
@Component
public class LimiteDeRoteiros {

    static final String POR_IP = "ROTEIRO_POR_IP";
    static final String POR_DIA = "ROTEIRO_POR_DIA";
    private static final String TODOS = "todos";

    private final LimiteDeTentativas limites;
    private final IpDoCliente ipDoCliente;
    private final int maximoPorIpPorHora;
    private final int maximoPorDia;

    public LimiteDeRoteiros(LimiteDeTentativas limites, IpDoCliente ipDoCliente,
                            @Value("${roteiro.limite-por-ip-por-hora:10}") int maximoPorIpPorHora,
                            @Value("${roteiro.limite-por-dia:30}") int maximoPorDia) {
        this.limites = limites;
        this.ipDoCliente = ipDoCliente;
        this.maximoPorIpPorHora = maximoPorIpPorHora;
        this.maximoPorDia = maximoPorDia;
    }

    /** Conta um roteiro pedido ou recusa com 429. */
    public void consumir(HttpServletRequest requisicao) {
        String ip = ipDoCliente.de(requisicao);
        if (maximoPorIpPorHora > 0) {
            limites.consumir(POR_IP, ip, maximoPorIpPorHora, Duration.ofHours(1),
                    "Muitos roteiros pedidos em pouco tempo.");
        }
        if (maximoPorDia > 0) {
            try {
                limites.consumir(POR_DIA, TODOS, maximoPorDia, Duration.ofDays(1),
                        "O limite diário de roteiros do Kyr foi atingido.");
            } catch (MuitasTentativasException e) {
                // O pedido não foi atendido: não conta para o limite do IP.
                if (maximoPorIpPorHora > 0) {
                    limites.devolver(POR_IP, ip);
                }
                throw e;
            }
        }
    }
}

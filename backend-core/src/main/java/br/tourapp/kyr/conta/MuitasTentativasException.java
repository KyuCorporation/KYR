package br.tourapp.kyr.conta;

import org.springframework.http.HttpStatus;

import java.time.Duration;

// 429 com o tempo de espera, que também vai no cabeçalho Retry-After.
public class MuitasTentativasException extends ContaException {

    private final long segundosDeEspera;

    public MuitasTentativasException(Duration espera) {
        this(espera, "Muitas tentativas.");
    }

    public MuitasTentativasException(Duration espera, String inicioDaMensagem) {
        super(HttpStatus.TOO_MANY_REQUESTS, "muitas_tentativas", inicioDaMensagem + " " + tempo(espera));
        this.segundosDeEspera = Math.max(1, (espera.toMillis() + 999) / 1000);
    }

    public long segundosDeEspera() {
        return segundosDeEspera;
    }

    private static String tempo(Duration espera) {
        long minutos = Math.max(1, (espera.toSeconds() + 59) / 60);
        if (minutos > 120) {
            long horas = (minutos + 59) / 60;
            return "Tente de novo em " + horas + " horas.";
        }
        return "Tente de novo em " + minutos + (minutos == 1 ? " minuto." : " minutos.");
    }
}

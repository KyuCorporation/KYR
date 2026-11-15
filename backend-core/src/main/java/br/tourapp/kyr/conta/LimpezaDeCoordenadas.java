package br.tourapp.kyr.conta;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

// Os termos da Places API permitem guardar latitude e longitude por no máximo 30 dias corridos.
// As coordenadas de origem e destino dos roteiros salvos podem ter vindo do Google, então são apagadas
// nesse prazo. O roteiro continua na lista, mas só pode ser reaberto escolhendo os lugares de novo.
@Component
@EnableScheduling
public class LimpezaDeCoordenadas {

    static final int DIAS_DE_RETENCAO = 30;

    private static final Logger log = LoggerFactory.getLogger(LimpezaDeCoordenadas.class);

    private final JdbcClient jdbc;

    public LimpezaDeCoordenadas(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @EventListener(ApplicationReadyEvent.class)
    @Scheduled(cron = "0 30 3 * * *")
    public void apagarCoordenadasVencidas() {
        try {
            int afetados = jdbc.sql("""
                            update roteiro_salvo
                               set origem_latitude = null, origem_longitude = null,
                                   destino_latitude = null, destino_longitude = null
                             where criado_em < now() - make_interval(days => :dias)
                               and (origem_latitude is not null or destino_latitude is not null)
                            """)
                    .param("dias", DIAS_DE_RETENCAO)
                    .update();
            if (afetados > 0) {
                log.info("Coordenadas apagadas de {} roteiro(s) salvo(s) com mais de {} dias.", afetados, DIAS_DE_RETENCAO);
            }
        } catch (RuntimeException e) {
            log.warn("Não foi possível apagar as coordenadas vencidas dos roteiros salvos: {}", e.getMessage());
        }
    }
}

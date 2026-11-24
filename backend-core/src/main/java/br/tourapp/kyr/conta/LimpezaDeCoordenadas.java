package br.tourapp.kyr.conta;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

// Os termos da Places API só permitem guardar o ID do lugar sem prazo. A origem e o destino dos roteiros
// salvos costumam vir das sugestões do Google (nome e coordenadas), então os dois são apagados em no máximo
// 30 dias, o prazo que os termos dão para coordenadas. O roteiro continua na lista, com a data e os IDs dos
// lugares, mas só pode ser reaberto escolhendo a origem e o destino de novo.
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
                                   destino_latitude = null, destino_longitude = null,
                                   origem_nome = '', destino_nome = ''
                             where criado_em < now() - make_interval(days => :dias)
                               and (origem_latitude is not null or destino_latitude is not null
                                    or origem_nome <> '' or destino_nome <> '')
                            """)
                    .param("dias", DIAS_DE_RETENCAO)
                    .update();
            if (afetados > 0) {
                log.info("Origem e destino apagados de {} roteiro(s) salvo(s) com mais de {} dias.", afetados, DIAS_DE_RETENCAO);
            }
        } catch (RuntimeException e) {
            log.warn("Não foi possível apagar a origem e o destino vencidos dos roteiros salvos: {}", e.getMessage());
        }
    }
}

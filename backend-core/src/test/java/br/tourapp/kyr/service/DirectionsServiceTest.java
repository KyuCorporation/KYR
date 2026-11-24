package br.tourapp.kyr.service;

import br.tourapp.kyr.dto.PontoDTO;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import java.io.IOException;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.anything;

class DirectionsServiceTest {

    private static final String CHAVE_SECRETA = "CHAVE-SECRETA-NAO-PODE-VAZAR";

    @Test
    void naoVazaAChaveNaExcecaoQuandoHaFalhaDeRede() {
        RestTemplate restTemplate = new RestTemplate();
        MockRestServiceServer server = MockRestServiceServer.bindTo(restTemplate).build();
        server.expect(anything()).andRespond(request -> {
            throw new IOException("conexão recusada");
        });

        DirectionsService service = new DirectionsService(restTemplate);
        ReflectionTestUtils.setField(service, "apiKey", CHAVE_SECRETA);

        PontoDTO origem = new PontoDTO("Origem", -25.60028, -54.485);
        PontoDTO destino = new PontoDTO("Destino", -25.5968, -54.5625);
        PontoDTO parada = new PontoDTO("Parada", -25.6953, -54.4367);

        assertThatThrownBy(() -> service.calcularRotaOtimizada(origem, destino, List.of(parada)))
                .isInstanceOf(IllegalStateException.class)
                .satisfies(ex -> {
                    assertThat(ex.getMessage()).doesNotContain(CHAVE_SECRETA);
                    assertThat(ex.getCause()).isNull();
                });
    }
}

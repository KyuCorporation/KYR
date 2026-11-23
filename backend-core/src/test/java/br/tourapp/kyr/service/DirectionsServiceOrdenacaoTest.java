package br.tourapp.kyr.service;

import br.tourapp.kyr.dto.PontoDTO;
import br.tourapp.kyr.dto.TrechoRotaDTO;
import br.tourapp.kyr.service.DirectionsService.ResultadoRota;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import java.io.IOException;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.ExpectedCount.never;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.anything;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

// Ordenação do roteiro pela Directions API (optimize:true): montagem da chamada, leitura da ordem e
// dos trechos, e erros sem vazar a chave de acesso (RNF3).
class DirectionsServiceOrdenacaoTest {

    private static final String CHAVE = "CHAVE-DE-TESTE-NAO-PODE-VAZAR";
    private static final PontoDTO AEROPORTO = new PontoDTO("Aeroporto", -25.5931, -54.4910);
    private static final PontoDTO CENTRO = new PontoDTO("Centro", -25.5469, -54.5882);
    private static final PontoDTO PARQUE = new PontoDTO("Parque das Aves", -25.6151, -54.4841);
    private static final PontoDTO MARCO = new PontoDTO("Marco", -25.5902, -54.5902);

    private RestTemplate restTemplate;
    private MockRestServiceServer google;
    private DirectionsService service;
    private final AtomicReference<URI> chamada = new AtomicReference<>();

    @BeforeEach
    void preparar() {
        restTemplate = new RestTemplate();
        google = MockRestServiceServer.bindTo(restTemplate).build();
        service = new DirectionsService(restTemplate);
        ReflectionTestUtils.setField(service, "apiKey", CHAVE);
    }

    private void responder(String json) {
        google.expect(request -> chamada.set(request.getURI())).andRespond(withSuccess(json, MediaType.APPLICATION_JSON));
    }

    private String parametros() {
        return URLDecoder.decode(chamada.get().getRawQuery(), StandardCharsets.UTF_8);
    }

    @Test
    void pedeAOrdemOtimizadaELeOsTrechos() {
        responder("""
                {"status": "OK", "routes": [{
                  "waypoint_order": [1, 0],
                  "legs": [
                    {"distance": {"value": 4200}, "duration": {"value": 600}},
                    {"distance": {"value": 3100}, "duration": {"value": 480}},
                    {"distance": {"value": 9800}, "duration": {"value": 900}}
                  ]}]}
                """);

        ResultadoRota rota = service.calcularRotaOtimizada(AEROPORTO, CENTRO, List.of(PARQUE, MARCO), "walking");

        assertThat(rota.ordemOtimizada()).containsExactly(1, 0);
        assertThat(rota.trechos()).containsExactly(
                new TrechoRotaDTO(4200L, 600L), new TrechoRotaDTO(3100L, 480L), new TrechoRotaDTO(9800L, 900L));
        assertThat(parametros())
                .contains("origin=-25.5931,-54.491")
                .contains("destination=-25.5469,-54.5882")
                .contains("waypoints=optimize:true|-25.6151,-54.4841|-25.5902,-54.5902")
                .contains("mode=walking");
        google.verify();
    }

    @Test
    void semModoInformadoUsaCarro() {
        responder("{\"status\": \"OK\", \"routes\": [{\"waypoint_order\": [], \"legs\": []}]}");

        service.calcularRotaOtimizada(AEROPORTO, CENTRO, List.of());

        assertThat(parametros()).contains("mode=driving");
    }

    @Test
    void statusDiferenteDeOkViraErroSemAChave() {
        responder("{\"status\": \"ZERO_RESULTS\", \"routes\": []}");

        assertThatThrownBy(() -> service.calcularRotaOtimizada(AEROPORTO, CENTRO, List.of(PARQUE)))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("ZERO_RESULTS")
                .satisfies(e -> assertThat(e.getMessage()).doesNotContain(CHAVE));
    }

    @Test
    void respostaVaziaViraErro() {
        google.expect(anything()).andRespond(withSuccess("", MediaType.APPLICATION_JSON));

        assertThatThrownBy(() -> service.calcularRotaOtimizada(AEROPORTO, CENTRO, List.of(PARQUE)))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("SEM_RESPOSTA");
    }

    @Test
    void falhaDeRedeNaoLevaAUrlComAChaveNaMensagemNemNaCausa() {
        google.expect(anything()).andRespond(request -> {
            throw new IOException("conexão recusada para " + request.getURI());
        });

        assertThatThrownBy(() -> service.calcularRotaOtimizada(AEROPORTO, CENTRO, List.of(PARQUE)))
                .isInstanceOf(IllegalStateException.class)
                .satisfies(e -> {
                    assertThat(e.getMessage()).doesNotContain(CHAVE).contains("Directions API");
                    assertThat(e.getCause()).isNull();
                });
    }

    @Test
    void semChaveConfiguradaNaoChamaOGoogle() {
        ReflectionTestUtils.setField(service, "apiKey", " ");
        google.expect(never(), anything());

        assertThatThrownBy(() -> service.calcularRotaOtimizada(AEROPORTO, CENTRO, List.of(PARQUE)))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("GOOGLE_MAPS_API_KEY");
        google.verify();
    }
}

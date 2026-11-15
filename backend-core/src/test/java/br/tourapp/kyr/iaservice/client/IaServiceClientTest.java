package br.tourapp.kyr.iaservice.client;

import br.tourapp.kyr.iaservice.client.dto.CuradoriaResponseDto;
import br.tourapp.kyr.iaservice.client.dto.PontoBrutoDto;
import br.tourapp.kyr.iaservice.exception.IaServiceException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.net.SocketTimeoutException;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withException;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class IaServiceClientTest {

    private static final String URL_CURADORIA = "http://ia-service:8000/curar-roteiro";

    private static final List<PontoBrutoDto> PONTOS = List.of(
            new PontoBrutoDto("Parque das Aves", "tourist_attraction", List.of(-25.6396, -54.4353)));

    private MockRestServiceServer server;
    private IaServiceClient client;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder().baseUrl("http://ia-service:8000");
        server = MockRestServiceServer.bindTo(builder).build();
        client = new IaServiceClient(builder.build());
    }

    @Test
    void deveEnviarPontosELerRespostaCuradaEmSnakeCase() {
        server.expect(requestTo(URL_CURADORIA))
                .andExpect(method(HttpMethod.POST))
                .andExpect(jsonPath("$.pontos[0].nome").value("Parque das Aves"))
                .andExpect(jsonPath("$.pontos[0].categoria").value("tourist_attraction"))
                .andExpect(jsonPath("$.pontos[0].coordenadas[0]").value(-25.6396))
                .andExpect(jsonPath("$.pontos[0].coordenadas[1]").value(-54.4353))
                .andRespond(withSuccess("""
                        {
                          "pontos": [
                            {
                              "nome": "Parque das Aves",
                              "categoria": "tourist_attraction",
                              "coordenadas": [-25.6396, -54.4353],
                              "trilha": "turismo",
                              "tipo": "lazer",
                              "descricao": "Parque de aves da Mata Atlântica.",
                              "curado": true
                            }
                          ],
                          "curado_por_ia": true,
                          "modelo_utilizado": "gemini-2.5-flash"
                        }
                        """, MediaType.APPLICATION_JSON));

        CuradoriaResponseDto resposta = client.curar(PONTOS);

        assertThat(resposta.curadoPorIa()).isTrue();
        assertThat(resposta.modeloUtilizado()).isEqualTo("gemini-2.5-flash");
        assertThat(resposta.pontos()).hasSize(1);
        assertThat(resposta.pontos().get(0).trilha()).isEqualTo("turismo");
        assertThat(resposta.pontos().get(0).tipo()).isEqualTo("lazer");
        assertThat(resposta.pontos().get(0).descricao()).isEqualTo("Parque de aves da Mata Atlântica.");
        assertThat(resposta.pontos().get(0).curado()).isTrue();
        server.verify();
    }

    @Test
    void deveLerRespostaSemCuradoriaQuandoNenhumProvedorRespondeu() {
        server.expect(requestTo(URL_CURADORIA))
                .andRespond(withSuccess("""
                        {
                          "pontos": [
                            {
                              "nome": "Parque das Aves",
                              "categoria": "tourist_attraction",
                              "coordenadas": [-25.6396, -54.4353],
                              "trilha": null,
                              "tipo": null,
                              "descricao": null,
                              "curado": false
                            }
                          ],
                          "curado_por_ia": false,
                          "modelo_utilizado": null
                        }
                        """, MediaType.APPLICATION_JSON));

        CuradoriaResponseDto resposta = client.curar(PONTOS);

        assertThat(resposta.curadoPorIa()).isFalse();
        assertThat(resposta.modeloUtilizado()).isNull();
        assertThat(resposta.pontos().get(0).curado()).isFalse();
        assertThat(resposta.pontos().get(0).trilha()).isNull();
    }

    @Test
    void deveLancarErroTratavelQuandoIaServiceRespondeErro500() {
        server.expect(requestTo(URL_CURADORIA)).andRespond(withServerError());

        assertThatThrownBy(() -> client.curar(PONTOS)).isInstanceOf(IaServiceException.class);
    }

    @Test
    void deveLancarErroTratavelQuandoIaServiceExcedeOTempoLimite() {
        server.expect(requestTo(URL_CURADORIA))
                .andRespond(withException(new SocketTimeoutException("Read timed out")));

        assertThatThrownBy(() -> client.curar(PONTOS)).isInstanceOf(IaServiceException.class);
    }
}

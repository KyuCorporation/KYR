package br.tourapp.kyr.controller;

import br.tourapp.kyr.dto.MetadadosDTO;
import br.tourapp.kyr.dto.POIDTO;
import br.tourapp.kyr.dto.PontoDTO;
import br.tourapp.kyr.dto.RoteiroResponseDTO;
import br.tourapp.kyr.poi.exception.GoogleMapsIntegrationException;
import br.tourapp.kyr.service.RoteiroService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;
import java.util.List;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(RoteiroController.class)
@AutoConfigureMockMvc(addFilters = false)
class RoteiroControllerTest {

    private static final String CORPO_VALIDO = """
            {
              "origem": {"nome": "Palmares", "latitude": -8.6841, "longitude": -35.5892},
              "destino": {"nome": "Recife", "latitude": -8.0476, "longitude": -34.8770}
            }
            """;

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private RoteiroService roteiroService;

    @Test
    void deveManterOsCamposAntigosEAcrescentarOsNovos() throws Exception {
        POIDTO poi = new POIDTO("Mercado de São José", "compras", "alimentacao", "Praça Dom Vital, Recife - PE",
                -8.0689, -34.8786, "https://maps.google.com/?cid=1", "Mercado público tradicional.", true, 1000L, 120L);
        when(roteiroService.gerarRoteiro(any())).thenReturn(new RoteiroResponseDTO(List.of(poi),
                new MetadadosDTO(1, 1234, "gemini-2.5-flash", true, "google-directions-api")));

        mockMvc.perform(post("/roteiros").contentType(MediaType.APPLICATION_JSON).content(CORPO_VALIDO))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pontos[0].nome").value("Mercado de São José"))
                .andExpect(jsonPath("$.pontos[0].trilha").value("compras"))
                .andExpect(jsonPath("$.pontos[0].tipo").value("alimentacao"))
                .andExpect(jsonPath("$.pontos[0].endereco").value("Praça Dom Vital, Recife - PE"))
                .andExpect(jsonPath("$.pontos[0].latitude").value(-8.0689))
                .andExpect(jsonPath("$.pontos[0].longitude").value(-34.8786))
                .andExpect(jsonPath("$.pontos[0].fonte").value("https://maps.google.com/?cid=1"))
                .andExpect(jsonPath("$.pontos[0].descricao").value("Mercado público tradicional."))
                .andExpect(jsonPath("$.pontos[0].distanciaMetros").value(1000))
                .andExpect(jsonPath("$.pontos[0].duracaoSegundos").value(120))
                .andExpect(jsonPath("$.pontos[0].curado").value(true))
                .andExpect(jsonPath("$.metadados.totalPontos").value(1))
                .andExpect(jsonPath("$.metadados.tempoRespostaMs").value(1234))
                .andExpect(jsonPath("$.metadados.fonteIA").value("gemini-2.5-flash"))
                .andExpect(jsonPath("$.metadados.curadoPorIa").value(true))
                .andExpect(jsonPath("$.metadados.fonteRota").value("google-directions-api"));
    }

    @Test
    void deveAceitarParadasETransporteEDevolverOsCamposNovos() throws Exception {
        POIDTO parada = POIDTO.daParada(new PontoDTO("Parque das Aves", -25.615, -54.4841));
        when(roteiroService.gerarRoteiro(any())).thenReturn(new RoteiroResponseDTO(List.of(parada),
                new MetadadosDTO(1, 900, "sem-curadoria", false, "google-directions-api", "WALKING")));

        mockMvc.perform(post("/roteiros").contentType(MediaType.APPLICATION_JSON).content("""
                        {
                          "origem": {"nome": "Aeroporto", "latitude": -25.6, "longitude": -54.48},
                          "destino": {"nome": "Centro", "latitude": -25.54, "longitude": -54.58},
                          "paradas": [{"nome": "Parque das Aves", "latitude": -25.615, "longitude": -54.4841}],
                          "transporte": "WALKING"
                        }
                        """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pontos[0].parada").value(true))
                .andExpect(jsonPath("$.metadados.transporte").value("WALKING"));
    }

    @Test
    void deveRetornar400ComTransporteDesconhecido() throws Exception {
        mockMvc.perform(post("/roteiros").contentType(MediaType.APPLICATION_JSON).content("""
                        {
                          "origem": {"nome": "Aeroporto", "latitude": -25.6, "longitude": -54.48},
                          "destino": {"nome": "Centro", "latitude": -25.54, "longitude": -54.58},
                          "transporte": "FOGUETE"
                        }
                        """))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(roteiroService);
    }

    @Test
    void deveRetornar400ComMaisDeOitoParadas() throws Exception {
        String parada = "{\"nome\": \"P\", \"latitude\": -25.6, \"longitude\": -54.5}";
        String paradas = String.join(",", Collections.nCopies(9, parada));
        mockMvc.perform(post("/roteiros").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"origem\": " + parada + ", \"destino\": " + parada + ", \"paradas\": [" + paradas + "]}"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(roteiroService);
    }

    @Test
    void deveRetornar400QuandoODestinoEstaAusente() throws Exception {
        String corpoSemDestino = """
                {"origem": {"nome": "Palmares", "latitude": -8.6841, "longitude": -35.5892}}
                """;

        mockMvc.perform(post("/roteiros").contentType(MediaType.APPLICATION_JSON).content(corpoSemDestino))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(roteiroService);
    }

    @Test
    void deveRetornar400QuandoUmaCoordenadaEstaAusente() throws Exception {
        String corpoSemLatitude = """
                {
                  "origem": {"nome": "Palmares", "longitude": -35.5892},
                  "destino": {"nome": "Recife", "latitude": -8.0476, "longitude": -34.8770}
                }
                """;

        mockMvc.perform(post("/roteiros").contentType(MediaType.APPLICATION_JSON).content(corpoSemLatitude))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(roteiroService);
    }

    @Test
    void deveRetornar502SemAChaveQuandoOPlacesFalha() throws Exception {
        when(roteiroService.gerarRoteiro(any())).thenThrow(
                new GoogleMapsIntegrationException("Falha de comunicação com a Places API (Forbidden)"));

        mockMvc.perform(post("/roteiros").contentType(MediaType.APPLICATION_JSON).content(CORPO_VALIDO))
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.codigo").value("erro_integracao_google_maps"))
                .andExpect(jsonPath("$.mensagem").value("Falha de comunicação com a Places API (Forbidden)"))
                .andExpect(content().string(not(containsString("key="))));
    }
}

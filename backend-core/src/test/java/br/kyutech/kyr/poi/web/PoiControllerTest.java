package br.kyutech.kyr.poi.web;

import br.kyutech.kyr.poi.exception.GoogleMapsIntegrationException;
import br.kyutech.kyr.poi.model.Coordenada;
import br.kyutech.kyr.poi.service.RotaPoiService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(PoiController.class)
@AutoConfigureMockMvc(addFilters = false)
class PoiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private RotaPoiService rotaPoiService;

    @Test
    void deveRetornarPoisERotaComSucesso() throws Exception {
        PoiDto poi = new PoiDto("Cataratas do Iguaçu", new Coordenada(-25.6953, -54.4367), "tourist_attraction", 4.8);
        RotaResponseDto resposta = new RotaResponseDto(
                List.of(poi),
                List.of(new Coordenada(-25.60028, -54.48500), new Coordenada(-25.59680, -54.56250)));
        when(rotaPoiService.buscarRoteiro(any())).thenReturn(resposta);

        mockMvc.perform(get("/api/v1/rotas/pois"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pois[0].nome").value("Cataratas do Iguaçu"))
                .andExpect(jsonPath("$.pois[0].nota").value(4.8))
                .andExpect(jsonPath("$.rota[0].latitude").value(-25.60028))
                .andExpect(jsonPath("$.rota").isArray());
    }

    @Test
    void deveRetornarErroTratavelQuandoIntegracaoFalha() throws Exception {
        when(rotaPoiService.buscarRoteiro(any()))
                .thenThrow(new GoogleMapsIntegrationException("Directions API retornou status REQUEST_DENIED"));

        mockMvc.perform(get("/api/v1/rotas/pois"))
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.codigo").value("erro_integracao_google_maps"));
    }

    @Test
    void deveRejeitarRaioInvalido() throws Exception {
        mockMvc.perform(get("/api/v1/rotas/pois").param("raioMetros", "-1"))
                .andExpect(status().isBadRequest());
    }
}

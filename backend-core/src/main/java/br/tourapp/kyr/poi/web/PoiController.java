package br.tourapp.kyr.poi.web;

import br.tourapp.kyr.poi.service.RotaPoiService;
import br.tourapp.kyr.service.LimiteDeRoteiros;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Positive;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/rotas/pois")
public class PoiController {

    // Maior raio aceito pela busca de lugares próximos da Places API.
    static final int RAIO_MAXIMO_METROS = 50_000;

    private final RotaPoiService rotaPoiService;
    private final LimiteDeRoteiros limiteDeRoteiros;

    public PoiController(RotaPoiService rotaPoiService, LimiteDeRoteiros limiteDeRoteiros) {
        this.rotaPoiService = rotaPoiService;
        this.limiteDeRoteiros = limiteDeRoteiros;
    }

    // Faz as mesmas buscas pagas no Google que um roteiro, então entra no mesmo limite de uso.
    @GetMapping
    public RotaResponseDto listarPoisNaRota(
            @RequestParam(required = false) @Positive @Max(RAIO_MAXIMO_METROS) Integer raioMetros,
            HttpServletRequest requisicao) {
        limiteDeRoteiros.consumir(requisicao);
        return rotaPoiService.buscarRoteiro(raioMetros);
    }
}

package br.tourapp.kyr.poi.web;

import br.tourapp.kyr.poi.service.RotaPoiService;
import jakarta.validation.constraints.Positive;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/rotas/pois")

public class PoiController {

    private final RotaPoiService rotaPoiService;

    public PoiController(RotaPoiService rotaPoiService) {
        this.rotaPoiService = rotaPoiService;
    }

    @GetMapping
    public RotaResponseDto listarPoisNaRota(@RequestParam(required = false) @Positive Integer raioMetros) {
        return rotaPoiService.buscarRoteiro(raioMetros);
    }
}

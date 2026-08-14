package br.tourapp.iaservice.web;

import br.tourapp.iaservice.curadoria.CuradoriaService;
import br.tourapp.iaservice.dto.RoteiroRequestDTO;
import br.tourapp.iaservice.dto.RoteiroResponseDTO;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class CuradoriaController {

    private final CuradoriaService curadoriaService;

    // Recebe POIs brutos e devolve a lista curada pelo LLM.

    public CuradoriaController(CuradoriaService curadoriaService) {
        this.curadoriaService = curadoriaService;
    }

    @PostMapping("/curar-roteiro")
    public RoteiroResponseDTO curarRoteiro(@Valid @RequestBody RoteiroRequestDTO request) {
        return curadoriaService.curarPontos(request.pontos());
    }
}

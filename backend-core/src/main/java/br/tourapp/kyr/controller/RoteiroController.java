package br.tourapp.kyr.controller;

import br.tourapp.kyr.dto.RoteiroRequestDTO;
import br.tourapp.kyr.dto.RoteiroResponseDTO;
import br.tourapp.kyr.service.LimiteDeRoteiros;
import br.tourapp.kyr.service.RoteiroService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/roteiros")
public class RoteiroController {

    private final RoteiroService roteiroService;
    private final LimiteDeRoteiros limiteDeRoteiros;

    public RoteiroController(RoteiroService roteiroService, LimiteDeRoteiros limiteDeRoteiros) {
        this.roteiroService = roteiroService;
        this.limiteDeRoteiros = limiteDeRoteiros;
    }

    // O corpo é validado antes de chegar aqui: um pedido inválido (400) não conta para o limite.
    @PostMapping
    public ResponseEntity<RoteiroResponseDTO> gerarRoteiro(@Valid @RequestBody RoteiroRequestDTO request,
                                                           HttpServletRequest requisicao) {
        limiteDeRoteiros.consumir(requisicao);
        return ResponseEntity.ok(roteiroService.gerarRoteiro(request));
    }
}

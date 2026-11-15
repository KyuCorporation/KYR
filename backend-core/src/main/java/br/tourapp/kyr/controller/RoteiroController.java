package br.tourapp.kyr.controller;

import br.tourapp.kyr.dto.RoteiroRequestDTO;
import br.tourapp.kyr.dto.RoteiroResponseDTO;
import br.tourapp.kyr.service.RoteiroService;
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

    public RoteiroController(RoteiroService roteiroService) {
        this.roteiroService = roteiroService;
    }

    @PostMapping
    public ResponseEntity<RoteiroResponseDTO> gerarRoteiro(@Valid @RequestBody RoteiroRequestDTO request) {
        return ResponseEntity.ok(roteiroService.gerarRoteiro(request));
    }
}

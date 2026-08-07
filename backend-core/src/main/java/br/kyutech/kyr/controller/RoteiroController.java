package br.kyutech.kyr.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import br.kyutech.kyr.dto.MetadadosDTO;
import br.kyutech.kyr.dto.POIDTO;
import br.kyutech.kyr.dto.RoteiroRequestDTO;
import br.kyutech.kyr.dto.RoteiroResponseDTO;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/roteiros")
public class RoteiroController {

    @PostMapping
    public ResponseEntity<RoteiroResponseDTO> gerarRoteiro(@Valid @RequestBody RoteiroRequestDTO request) {
        long inicio = System.currentTimeMillis();

        // MOCK: nesta sprint (US-05), a resposta do ia-service é simulada,
        // e as coordenadas são fixas (não vêm de geocoding real ainda).
        // A integração real com o ia-service acontece na US-06.
        // TODO: substituir coordenadas fixas por geocoding real (US-10).
        List<POIDTO> pontosMockados = List.of(
            new POIDTO(
                "Cataratas do Iguaçu (Parque Nacional do Iguaçu)",
                "turismo",
                "lazer",
                "Bus Terminus - Rod, BR-469 - Km 18, Foz do Iguaçu - PR, 85853-830",
                -25.6953,
                -54.4367,
                "https://maps.app.goo.gl/mWfjwq78VQKvUKL16",
                "Principal atração da região e Patrimônio Natural da Humanidade, abriga as famosas quedas d'água."
            ),
            new POIDTO(
                "Parque das Aves",
                "turismo",
                "lazer",
                "Av. das Cataratas, 12450 - KM 17,1 - Parque Nacional, Foz do Iguaçu - PR, 85859-899",
                -25.6396,
                -54.4353,
                "https://maps.app.goo.gl/DhiuABmW3ETV7Lkd9",
                "Maior parque de aves da América Latina, dedicado à conservação de espécies da Mata Atlântica."
            )
        );

        long tempoResposta = System.currentTimeMillis() - inicio;

        MetadadosDTO metadados = new MetadadosDTO(
            pontosMockados.size(),
            tempoResposta,
            "mock"
        );

        return ResponseEntity.ok(new RoteiroResponseDTO(pontosMockados, metadados));
    }
}

package br.kyutech.kyr.controller;

import br.kyutech.kyr.dto.MetadadosDTO;
import br.kyutech.kyr.dto.POIDTO;
import br.kyutech.kyr.dto.PontoDTO;
import br.kyutech.kyr.dto.RoteiroRequestDTO;
import br.kyutech.kyr.dto.RoteiroResponseDTO;
import br.kyutech.kyr.dto.TrechoRotaDTO;
import br.kyutech.kyr.service.DirectionsService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
 
import java.util.ArrayList;
import java.util.List;
 
@RestController
@RequestMapping("/roteiros")
public class RoteiroController {
 
    private static final Logger log = LoggerFactory.getLogger(RoteiroController.class);
 
    private final DirectionsService directionsService;
 
    public RoteiroController(DirectionsService directionsService) {
        this.directionsService = directionsService;
    }
 
    @PostMapping
    public ResponseEntity<RoteiroResponseDTO> gerarRoteiro(@Valid @RequestBody RoteiroRequestDTO request) {
        long inicio = System.currentTimeMillis();
 
        // Dataset curado da US-11 (nesta sprint, ainda um subconjunto fixo;
        // a curadoria completa e a classificação automática vêm na US-17).
        List<PoiBruto> pontosCurados = List.of(
            new PoiBruto(
                "Cataratas do Iguaçu (Parque Nacional do Iguaçu)",
                "turismo", "lazer",
                "Bus Terminus - Rod, BR-469 - Km 18, Foz do Iguaçu - PR, 85853-830",
                -25.6953, -54.4367,
                "https://maps.app.goo.gl/mWfjwq78VQKvUKL16",
                "Principal atração da região e Patrimônio Natural da Humanidade, abriga as famosas quedas d'água."
            ),
            new PoiBruto(
                "Parque das Aves",
                "turismo", "lazer",
                "Av. das Cataratas, 12450 - KM 17,1 - Parque Nacional, Foz do Iguaçu - PR, 85859-899",
                -25.6396, -54.4353,
                "https://maps.app.goo.gl/DhiuABmW3ETV7Lkd9",
                "Maior parque de aves da América Latina, dedicado à conservação de espécies da Mata Atlântica."
            )
        );
 
        List<POIDTO> pontosOrdenados;
        String fonteRota;
 
        try {
            List<PontoDTO> waypoints = pontosCurados.stream()
                .map(p -> new PontoDTO(p.nome(), p.latitude(), p.longitude()))
                .toList();
 
            DirectionsService.ResultadoRota rota = directionsService.calcularRotaOtimizada(
                request.origem(), request.destino(), waypoints
            );
 
            pontosOrdenados = montarPontosOrdenados(pontosCurados, rota.ordemOtimizada(), rota.trechos());
            fonteRota = "google-directions-api";
 
        } catch (Exception e) {
            // Fallback: Directions API indisponível, sem chave configurada, ou erro de rede.
            // Mantém o fluxo funcionando com a ordem original e sem distância/tempo,
            // em vez de derrubar o endpoint inteiro.
            log.warn("Falha ao calcular rota via Directions API, usando fallback sem otimização: {}", e.getMessage());
            pontosOrdenados = pontosCurados.stream()
                .map(p -> new POIDTO(
                    p.nome(), p.trilha(), p.tipo(), p.endereco(),
                    p.latitude(), p.longitude(), p.fonte(), p.descricao(),
                    null, null
                ))
                .toList();
            fonteRota = "fallback-sem-otimizacao";
        }
 
        long tempoResposta = System.currentTimeMillis() - inicio;
 
        MetadadosDTO metadados = new MetadadosDTO(
            pontosOrdenados.size(),
            tempoResposta,
            fonteRota
        );
 
        return ResponseEntity.ok(new RoteiroResponseDTO(pontosOrdenados, metadados));
    }
 
    private List<POIDTO> montarPontosOrdenados(
        List<PoiBruto> pontosCurados,
        List<Integer> ordemOtimizada,
        List<TrechoRotaDTO> trechos
    ) {
        List<POIDTO> resultado = new ArrayList<>();
        for (int i = 0; i < ordemOtimizada.size(); i++) {
            PoiBruto poi = pontosCurados.get(ordemOtimizada.get(i));
            TrechoRotaDTO trecho = trechos.get(i);
            resultado.add(new POIDTO(
                poi.nome(), poi.trilha(), poi.tipo(), poi.endereco(),
                poi.latitude(), poi.longitude(), poi.fonte(), poi.descricao(),
                trecho.distanciaMetros(), trecho.tempoSegundos()
            ));
        }
        return resultado;
    }
 
    private record PoiBruto(
        String nome, String trilha, String tipo, String endereco,
        Double latitude, Double longitude, String fonte, String descricao
    ) {}
}

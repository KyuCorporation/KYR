package br.tourapp.kyr.poi.service;

import br.tourapp.kyr.poi.client.GoogleDirectionsClient;
import br.tourapp.kyr.poi.client.GooglePlacesClient;
import br.tourapp.kyr.poi.client.PolylineDecoder;
import br.tourapp.kyr.poi.client.dto.DirectionsResponseDto;
import br.tourapp.kyr.poi.client.dto.DirectionsRouteDto;
import br.tourapp.kyr.poi.client.dto.DirectionsStepDto;
import br.tourapp.kyr.poi.client.dto.GooglePlaceDto;
import br.tourapp.kyr.poi.client.dto.LatLngDto;
import br.tourapp.kyr.poi.config.GoogleMapsProperties;
import br.tourapp.kyr.poi.exception.GoogleMapsIntegrationException;
import br.tourapp.kyr.poi.model.Coordenada;
import br.tourapp.kyr.poi.model.PoiCandidato;
import br.tourapp.kyr.poi.model.PoisNaRota;
import br.tourapp.kyr.poi.web.PoiDto;
import br.tourapp.kyr.poi.web.RotaResponseDto;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

@Service
public class RotaPoiService {

    private final GoogleDirectionsClient directionsClient;
    private final GooglePlacesClient placesClient;
    private final PoiNormalizer normalizer;
    private final GoogleMapsProperties properties;

    public RotaPoiService(GoogleDirectionsClient directionsClient, GooglePlacesClient placesClient, PoiNormalizer normalizer, GoogleMapsProperties properties) {
        this.directionsClient = directionsClient;
        this.placesClient = placesClient;
        this.normalizer = normalizer;
        this.properties = properties;
    }

    public RotaResponseDto buscarRoteiro(Integer raioMetrosParam) {
        PoisNaRota poisNaRota = buscarPoisNaRota(properties.rota().origem(), properties.rota().destino(), raioMetrosParam);

        List<PoiDto> pois = poisNaRota.candidatos().stream()
                .map(candidato -> new PoiDto(candidato.nome(), candidato.coordenadas(), candidato.categoria(), candidato.nota()))
                .toList();

        return new RotaResponseDto(pois, poisNaRota.rota());
    }

    public PoisNaRota buscarPoisNaRota(Coordenada origem, Coordenada destino, Integer raioMetrosParam) {
        return buscarPoisNaRota(origem, destino, List.of(), "driving", raioMetrosParam);
    }

    // Busca lugares ao longo da rota que passa pelas paradas, no modo de viagem informado.
    public PoisNaRota buscarPoisNaRota(Coordenada origem, Coordenada destino, List<Coordenada> paradas, String modo,
                                       Integer raioMetrosParam) {
        int raioMetros = raioMetrosParam != null ? raioMetrosParam : properties.poi().raioBuscaMetros();

        DirectionsResponseDto resposta = paradas.isEmpty() && "driving".equals(modo)
                ? directionsClient.buscarRota(origem, destino)
                : directionsClient.buscarRota(origem, destino, paradas, modo);

        DirectionsRouteDto primeiraRota = resposta.routes().stream()
                .findFirst()
                .orElseThrow(() -> new GoogleMapsIntegrationException("Nenhuma rota retornada pela Directions API"));

        List<Coordenada> pontosIntermediarios = extrairPontosIntermediarios(primeiraRota, properties.poi().maxPontosIntermediarios());

        List<Coordenada> linhaDaRota = decodificarLinhaDaRota(primeiraRota);

        Map<String, GooglePlaceDto> placesUnicos = new LinkedHashMap<>();
        for (Coordenada ponto : pontosIntermediarios) {
            List<GooglePlaceDto> encontrados = placesClient.buscarProximos(ponto, raioMetros);
            for (GooglePlaceDto place : encontrados) {
                if (place.id() != null) {
                    placesUnicos.putIfAbsent(place.id(), place);
                }
            }
        }

        List<PoiCandidato> candidatos = placesUnicos.values().stream()
                .map(normalizer::normalizarCandidato)
                .flatMap(Optional::stream)
                .toList();

        return new PoisNaRota(candidatos, linhaDaRota);
    }

    private List<Coordenada> extrairPontosIntermediarios(DirectionsRouteDto rota, int maxPontos) {
        List<Coordenada> pontosDaRota = rota.legs().stream()
                .flatMap(leg -> leg.steps().stream())
                .map(DirectionsStepDto::endLocation)
                .filter(Objects::nonNull)
                .map(this::paraCoordenada)
                .toList();

        if (pontosDaRota.isEmpty()) {
            throw new GoogleMapsIntegrationException("Nenhum trecho de rota retornado pela Directions API");
        }

        return amostrarPontos(pontosDaRota, maxPontos);
    }

    private List<Coordenada> decodificarLinhaDaRota(DirectionsRouteDto rota) {
        if (rota.overviewPolyline() == null || rota.overviewPolyline().points() == null) {
            throw new GoogleMapsIntegrationException("Directions API não retornou overview_polyline");
        }
        try {
            return PolylineDecoder.decode(rota.overviewPolyline().points());
        } catch (IndexOutOfBoundsException e) {
            throw new GoogleMapsIntegrationException("Directions API devolveu uma overview_polyline malformada", e);
        }
    }

    private Coordenada paraCoordenada(LatLngDto latLng) {
        return new Coordenada(latLng.lat(), latLng.lng());
    }

    private List<Coordenada> amostrarPontos(List<Coordenada> pontos, int maxPontos) {
        if (pontos.size() <= maxPontos) {
            return pontos;
        }
        List<Coordenada> amostra = new ArrayList<>(maxPontos);
        double passo = (double) pontos.size() / maxPontos;

        for (int i = 0; i < maxPontos; i++) {
            amostra.add(pontos.get((int) (i * passo)));
        }

        return amostra;
    }
}

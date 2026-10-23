package br.kyutech.kyr.poi.service;

import br.kyutech.kyr.poi.client.GoogleDirectionsClient;
import br.kyutech.kyr.poi.client.GooglePlacesClient;
import br.kyutech.kyr.poi.client.PolylineDecoder;
import br.kyutech.kyr.poi.client.dto.DirectionsResponseDto;
import br.kyutech.kyr.poi.client.dto.DirectionsRouteDto;
import br.kyutech.kyr.poi.client.dto.DirectionsStepDto;
import br.kyutech.kyr.poi.client.dto.GooglePlaceDto;
import br.kyutech.kyr.poi.client.dto.LatLngDto;
import br.kyutech.kyr.poi.config.GoogleMapsProperties;
import br.kyutech.kyr.poi.exception.GoogleMapsIntegrationException;
import br.kyutech.kyr.poi.model.Coordenada;
import br.kyutech.kyr.poi.web.PoiDto;
import br.kyutech.kyr.poi.web.RotaResponseDto;
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
        int raioMetros = raioMetrosParam != null ? raioMetrosParam : properties.poi().raioBuscaMetros();

        DirectionsResponseDto resposta = directionsClient.buscarRota(properties.rota().origem(), properties.rota().destino());

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

        List<PoiDto> pois = placesUnicos.values().stream()
                .map(normalizer::normalizar)
                .flatMap(Optional::stream)
                .toList();

        return new RotaResponseDto(pois, linhaDaRota);
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
        return PolylineDecoder.decode(rota.overviewPolyline().points());
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

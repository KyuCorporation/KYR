"use client";

import { useEffect, useRef, useState } from "react";
import { useGoogleMapsScript } from "@/hooks/useGoogleMapsScript";

export type RouteInfo = {
  distanceText: string;
  durationText: string;
};

export type TravelModeKey = "DRIVING" | "WALKING" | "BICYCLING" | "TRANSIT";

type Props = {
  /** Origem como "latitude,longitude". Vazio = ainda não calcula rota. */
  origin: string;
  /** Destino como "latitude,longitude". Vazio = ainda não calcula rota. */
  destination: string;
  /** Paradas como "latitude,longitude", na ordem em que devem ser visitadas. */
  waypoints: string[];
  travelMode: TravelModeKey;
  /** Chamado sempre que uma rota é calculada (ou null se não foi possível). */
  onRouteInfo?: (info: RouteInfo | null) => void;
  /** Chamado com uma mensagem amigável quando a rota falha (ou null quando limpa/resolve). */
  onError?: (message: string | null) => void;
};

const BRAZIL_CENTER = { lat: -14.235, lng: -51.9253 };

// O mapa usa o mesmo carregador do restante do app (useGoogleMapsScript).
// Carregar o SDK do Google Maps por dois caminhos na mesma página (por exemplo,
// este hook e o APIProvider do @vis.gl/react-google-maps) cria duas cópias da
// biblioteca e quebra com "not an instance of Map" e "Loader.provide not called".
export default function GoogleMapRoute({
  origin,
  destination,
  waypoints,
  travelMode,
  onRouteInfo,
  onError,
}: Props) {
  const { carregado, erro } = useGoogleMapsScript();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const onRouteInfoRef = useRef(onRouteInfo);
  const onErrorRef = useRef(onError);
  const [mapaPronto, setMapaPronto] = useState(false);

  useEffect(() => {
    onRouteInfoRef.current = onRouteInfo;
  }, [onRouteInfo]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  // Cria o mapa, o serviço e o desenhador de rotas uma única vez, depois que o SDK carrega.
  useEffect(() => {
    if (!carregado || !containerRef.current) return;

    const map = new google.maps.Map(containerRef.current, {
      center: BRAZIL_CENTER,
      zoom: 5,
      gestureHandling: "greedy",
    });
    const renderer = new google.maps.DirectionsRenderer({ map });
    directionsServiceRef.current = new google.maps.DirectionsService();
    directionsRendererRef.current = renderer;
    setMapaPronto(true);

    return () => {
      renderer.setMap(null);
      directionsServiceRef.current = null;
      directionsRendererRef.current = null;
      setMapaPronto(false);
    };
  }, [carregado]);

  // Sempre que origem, destino, paradas ou modo de transporte mudarem,
  // recalcula a rota real via Directions API.
  const waypointsKey = waypoints.join("|");

  useEffect(() => {
    const directionsService = directionsServiceRef.current;
    const directionsRenderer = directionsRendererRef.current;
    if (!mapaPronto || !directionsService || !directionsRenderer) return;

    if (!origin || !destination) {
      directionsRenderer.set("directions", null);
      onRouteInfoRef.current?.(null);
      onErrorRef.current?.(null);
      return;
    }

    let ativo = true;

    directionsService
      .route({
        origin,
        destination,
        waypoints: waypointsKey
          .split("|")
          .filter(Boolean)
          .map((address) => ({ location: address, stopover: true })),
        // O enum TravelMode do Maps usa, em runtime, as mesmas strings das chaves.
        travelMode: travelMode as google.maps.TravelMode,
        provideRouteAlternatives: false,
      })
      .then((result) => {
        if (!ativo) return;
        directionsRenderer.setDirections(result);
        onErrorRef.current?.(null);

        const legs = result.routes[0]?.legs ?? [];
        const totalMeters = legs.reduce((acc, leg) => acc + (leg.distance?.value ?? 0), 0);
        const totalSeconds = legs.reduce((acc, leg) => acc + (leg.duration?.value ?? 0), 0);

        // Mesmo formato do resultado do roteiro (core/routeMetrics): vírgula decimal, uma casa no máximo.
        const km = totalMeters / 1000;
        const distanceText = km >= 1
          ? `${km.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km`
          : `${totalMeters} m`;

        const totalMinutes = Math.round(totalSeconds / 60);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        const durationText = hours > 0 ? `${hours}h ${minutes}min` : `${minutes} min`;

        onRouteInfoRef.current?.({ distanceText, durationText });
      })
      .catch((error: unknown) => {
        if (!ativo) return;
        console.error("Não foi possível calcular a rota:", error);
        directionsRenderer.set("directions", null);
        onRouteInfoRef.current?.(null);
        onErrorRef.current?.(friendlyDirectionsError(error, travelMode));
      });

    return () => {
      ativo = false;
    };
  }, [mapaPronto, origin, destination, waypointsKey, travelMode]);

  if (erro) {
    return (
      <div
        role="alert"
        style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", padding: 16, textAlign: "center" }}
      >
        Não foi possível carregar o mapa. {erro}
      </div>
    );
  }

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}

/** Traduz os status de erro da Directions API em mensagens que fazem sentido pro usuário final. */
function friendlyDirectionsError(error: unknown, travelMode: TravelModeKey): string {
  const status =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code)
      : "";

  if (status === "ZERO_RESULTS" && travelMode === "TRANSIT") {
    return "Não encontramos rota de transporte público entre esses endereços — o Google ainda não tem dados de ônibus/metrô para essa região. Tente outro meio de transporte.";
  }
  if (status === "ZERO_RESULTS") {
    return "Não encontramos uma rota entre esses endereços para o meio de transporte selecionado.";
  }
  if (status === "NOT_FOUND") {
    return "Não foi possível localizar um dos endereços informados. Tente selecionar novamente pela lista de sugestões.";
  }
  if (status === "OVER_QUERY_LIMIT" || status === "REQUEST_DENIED") {
    return "Não foi possível consultar o Google Maps agora. Verifique a chave de API configurada.";
  }
  return "Não foi possível calcular a rota para esse trajeto. Confira os endereços e tente novamente.";
}

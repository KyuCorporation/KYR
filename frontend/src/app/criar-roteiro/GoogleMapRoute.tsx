"use client";

import { useEffect, useMemo } from "react";
import {
  APIProvider,
  Map,
  useMap,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";

export type RouteInfo = {
  distanceText: string;
  durationText: string;
};

export type TravelModeKey = "DRIVING" | "WALKING" | "BICYCLING" | "TRANSIT";

type Props = {
  apiKey: string;
  /** Endereço/nome do local de origem. Vazio = ainda não calcula rota. */
  origin: string;
  /** Endereço/nome do local de destino. Vazio = ainda não calcula rota. */
  destination: string;
  /** Endereços das paradas, na ordem em que devem ser visitadas. */
  waypoints: string[];
  travelMode: TravelModeKey;
  /** Chamado sempre que uma rota é calculada (ou null se não foi possível). */
  onRouteInfo?: (info: RouteInfo | null) => void;
  /** Chamado com uma mensagem amigável quando a rota falha (ou null quando limpa/resolve). */
  onError?: (message: string | null) => void;
};

const BRAZIL_CENTER = { lat: -14.235, lng: -51.9253 };

export default function GoogleMapRoute({
  apiKey,
  origin,
  destination,
  waypoints,
  travelMode,
  onRouteInfo,
  onError,
}: Props) {
  return (
    <APIProvider apiKey={apiKey}>
      <Map
        defaultCenter={BRAZIL_CENTER}
        defaultZoom={5}
        gestureHandling="greedy"
        disableDefaultUI={false}
        mapId="criar-roteiro-map"
        style={{ width: "100%", height: "100%" }}
      />
      <RouteDirections
        origin={origin}
        destination={destination}
        waypoints={waypoints}
        travelMode={travelMode}
        onRouteInfo={onRouteInfo}
        onError={onError}
      />
    </APIProvider>
  );
}

function RouteDirections({
  origin,
  destination,
  waypoints,
  travelMode,
  onRouteInfo,
  onError,
}: Omit<Props, "apiKey">) {
  const map = useMap();
  const routesLibrary = useMapsLibrary("routes");

  // directionsService/directionsRenderer são derivados de routesLibrary e map,
  // então usamos useMemo em vez de useState+useEffect (evita cascading renders
  // e o erro react-hooks/set-state-in-effect).
  const directionsService = useMemo(() => {
    if (!routesLibrary) return undefined;
    return new routesLibrary.DirectionsService();
  }, [routesLibrary]);

  const directionsRenderer = useMemo(() => {
    if (!routesLibrary || !map) return undefined;
    return new routesLibrary.DirectionsRenderer({ map });
  }, [routesLibrary, map]);

  // Tipos derivados diretamente da instância do serviço, sem referenciar o
  // identificador global "google" em nenhum lugar do arquivo. Isso evita o
  // erro "Não é possível encontrar o nome 'google'" quando @types/google.maps
  // não está instalado/resolvido no ambiente de lint/build.
  type DirectionsRequest = Parameters<
    NonNullable<typeof directionsService>["route"]
  >[0];
  type DirectionsResult = Awaited<
    ReturnType<NonNullable<typeof directionsService>["route"]>
  >;
  type DirectionsLeg = NonNullable<
    DirectionsResult["routes"][number]["legs"]
  >[number];

  // Sempre que origem, destino, paradas ou modo de transporte mudarem,
  // recalcula a rota real via Directions API.
  const waypointsKey = waypoints.join("|");

  useEffect(() => {
    if (!directionsService || !directionsRenderer) return;

    if (!origin || !destination) {
      directionsRenderer.set("directions", null);
      onRouteInfo?.(null);
      onError?.(null);
      return;
    }

    const request: DirectionsRequest = {
      origin,
      destination,
      waypoints: waypoints
        .filter(Boolean)
        .map((address) => ({ location: address, stopover: true })),
      // O enum TravelMode do Maps usa, em runtime, as mesmas strings das
      // chaves ("DRIVING", "WALKING", ...), então passamos a própria chave
      // sem precisar nomear o namespace "google".
      travelMode: travelMode as DirectionsRequest["travelMode"],
      provideRouteAlternatives: false,
    };

    directionsService
      .route(request)
      .then((result: DirectionsResult) => {
        directionsRenderer.setDirections(result);
        onError?.(null);

        const legs: DirectionsLeg[] = result.routes[0]?.legs ?? [];
        const totalMeters = legs.reduce(
          (acc: number, leg: DirectionsLeg) =>
            acc + (leg.distance?.value ?? 0),
          0
        );
        const totalSeconds = legs.reduce(
          (acc: number, leg: DirectionsLeg) =>
            acc + (leg.duration?.value ?? 0),
          0
        );

        const km = totalMeters / 1000;
        const distanceText = km >= 1 ? `${km.toFixed(1)} km` : `${totalMeters} m`;

        const totalMinutes = Math.round(totalSeconds / 60);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        const durationText =
          hours > 0 ? `${hours}h ${minutes}min` : `${minutes} min`;

        onRouteInfo?.({ distanceText, durationText });
      })
      .catch((error: unknown) => {
        console.error("Não foi possível calcular a rota:", error);
        directionsRenderer.set("directions", null);
        onRouteInfo?.(null);
        onError?.(friendlyDirectionsError(error, travelMode));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [directionsService, directionsRenderer, origin, destination, waypointsKey, travelMode]);

  return null;
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
  return "Não foi possível calcular a rota para esse trajeto. Mostrando uma estimativa aproximada.";
}
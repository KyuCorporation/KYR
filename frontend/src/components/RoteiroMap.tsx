"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LocalRoteiro, PontoDeInteresse, Transporte, Trilha } from "@/types/roteiro";
import { useGoogleMapsScript } from "@/hooks/useGoogleMapsScript";
import { montarCartaoDoPonto } from "@/components/cartaoDoPonto";

// US-20 — Mapa interativo com os pontos do roteiro
// Critérios de aceite:
// - Mapa embutido (Google Maps JS SDK) exibe marcadores para cada POI do roteiro
// - Clique no marcador mostra nome e trilha do ponto
//
// Extensão pedida depois (layout lista + mapa lado a lado, referência Figma):
// - Uma linha (Polyline) conecta os pontos na ordem do roteiro, mostrando o caminho
// - Selecionar um ponto pela lista também destaca/centraliza ele no mapa
//
// Pré-requisito: variável de ambiente NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
// configurada (ver .env.example). Sem ela, o componente mostra uma
// mensagem explicando o que falta, em vez de quebrar a tela.

// Mesma família de cores usada nos badges da RoteiroList, para o mapa
// e a lista contarem a mesma história visual.
const TRILHA_MARKER_COLOR: Record<Trilha, string> = {
  turismo: "#059669", // emerald-600
  compras: "#d97706", // amber-600
};

const COR_MARCADOR_DESCONHECIDO = "#71717a"; // zinc-500
const COR_ROTA = "#c2410c"; // orange-700, cor de destaque do produto

// Centro de fallback (Foz do Iguaçu) para quando ainda não há pontos.
const CENTRO_PADRAO = { lat: -25.6003, lng: -54.4854 };

interface PontoComCoordenadas extends PontoDeInteresse {
  latitude: number;
  longitude: number;
}

function temCoordenadas(ponto: PontoDeInteresse): ponto is PontoComCoordenadas {
  return typeof ponto.latitude === "number" && typeof ponto.longitude === "number";
}

interface RoteiroMapProps {
  pontos: PontoDeInteresse[];
  /** id do ponto selecionado (ex: clicado na lista ao lado). Opcional. */
  pontoSelecionadoId?: string | null;
  /** chamado quando o próprio marcador é clicado, para sincronizar com a lista. */
  onSelecionarPonto?: (id: string) => void;
  /** classe Tailwind de altura. Padrão: "h-72". Use "h-full" em layouts que já controlam a altura pelo pai. */
  altura?: string;
  /** quando true, remove borda e cantos arredondados próprios (útil quando o mapa ocupa a tela toda e o contêiner pai já cuida disso). */
  semBorda?: boolean;
  rota?: { origem: LocalRoteiro; destino: LocalRoteiro };
  onErroRota?: (message: string | null) => void;
  /** Meio de transporte do roteiro. No transporte público a rota é desenhada como linha reta entre os pontos. */
  transporte?: Transporte;
}

export default function RoteiroMap({
  pontos,
  pontoSelecionadoId = null,
  onSelecionarPonto,
  altura = "h-72",
  semBorda = false,
  rota,
  onErroRota,
  transporte = "DRIVING",
}: RoteiroMapProps) {
  const { carregado, erro } = useGoogleMapsScript();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const cartoesRef = useRef<Map<string, string>>(new Map());
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const onSelecionarPontoRef = useRef(onSelecionarPonto);
  const onErroRotaRef = useRef(onErroRota);
  const [directionsConcluidas, setDirectionsConcluidas] = useState<string | null>(null);

  useEffect(() => {
    onSelecionarPontoRef.current = onSelecionarPonto;
  }, [onSelecionarPonto]);

  useEffect(() => {
    onErroRotaRef.current = onErroRota;
  }, [onErroRota]);

  // useMemo evita recriar essa lista (e disparar o efeito abaixo) em todo
  // re-render — só recalcula quando o array `pontos` realmente muda.
  const pontosComCoordenadas = useMemo(() => pontos.filter(temCoordenadas), [pontos]);
  const origemNome = rota?.origem.nome;
  const origemLatitude = rota?.origem.latitude;
  const origemLongitude = rota?.origem.longitude;
  const destinoNome = rota?.destino.nome;
  const destinoLatitude = rota?.destino.latitude;
  const destinoLongitude = rota?.destino.longitude;
  const rotaNormalizada = useMemo(
    () => origemNome !== undefined && origemLatitude !== undefined && origemLongitude !== undefined
      && destinoNome !== undefined && destinoLatitude !== undefined && destinoLongitude !== undefined
      ? {
          origem: { nome: origemNome, latitude: origemLatitude, longitude: origemLongitude },
          destino: { nome: destinoNome, latitude: destinoLatitude, longitude: destinoLongitude },
        }
      : null,
    [
      origemNome,
      origemLatitude,
      origemLongitude,
      destinoNome,
      destinoLatitude,
      destinoLongitude,
    ],
  );
  const directionsKey = rotaNormalizada
    ? [
        rotaNormalizada.origem.latitude,
        rotaNormalizada.origem.longitude,
        rotaNormalizada.destino.latitude,
        rotaNormalizada.destino.longitude,
        ...pontosComCoordenadas.map((ponto) => ponto.id),
      ].join(":")
    : null;
  // No transporte público a rota não é pedida à Directions, então não há o que esperar.
  const rotaCarregando = Boolean(rotaNormalizada && transporte !== "TRANSIT" && directionsConcluidas !== directionsKey);

  function abrirInfoWindow(ponto: PontoComCoordenadas, marker: google.maps.Marker) {
    const map = mapRef.current;
    if (!infoWindowRef.current || !map) return;
    infoWindowRef.current.setContent(cartoesRef.current.get(ponto.id) ?? "");
    infoWindowRef.current.open({ anchor: marker, map });
  }

  // Cria/atualiza o mapa, os marcadores e a linha da rota sempre que os
  // pontos mudarem (ex: trocar de cenário, ou quando os dados reais chegarem).
  useEffect(() => {
    if (!carregado || !containerRef.current) return;

    if (!mapRef.current) {
      mapRef.current = new google.maps.Map(containerRef.current, {
        center: CENTRO_PADRAO,
        zoom: 12,
        streetViewControl: false,
        mapTypeControl: false,
      });
      infoWindowRef.current = new google.maps.InfoWindow();
    }

    const map = mapRef.current;

    // Remove marcadores e rota antigos antes de redesenhar, para não
    // duplicar quando os dados do roteiro mudarem.
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current.clear();
    cartoesRef.current.clear();
    polylineRef.current?.setMap(null);
    polylineRef.current = null;
    directionsRendererRef.current?.setMap(null);
    directionsRendererRef.current = null;

    if (pontosComCoordenadas.length === 0 && !rotaNormalizada) return;

    const bounds = new google.maps.LatLngBounds();
    const caminho: google.maps.LatLngLiteral[] = [];

    if (rotaNormalizada) {
      const origemPosition = { lat: rotaNormalizada.origem.latitude, lng: rotaNormalizada.origem.longitude };
      const destinoPosition = { lat: rotaNormalizada.destino.latitude, lng: rotaNormalizada.destino.longitude };
      bounds.extend(origemPosition);
      bounds.extend(destinoPosition);
      const originMarker = new google.maps.Marker({
        position: origemPosition,
        map,
        title: `Origem: ${rotaNormalizada.origem.nome}`,
        label: { text: "O", color: "#ffffff", fontWeight: "700" },
        icon: { path: google.maps.SymbolPath.CIRCLE, scale: 10, fillColor: COR_ROTA, fillOpacity: 1, strokeColor: "#ffffff", strokeWeight: 2 },
      });
      const destinationMarker = new google.maps.Marker({
        position: destinoPosition,
        map,
        title: `Destino: ${rotaNormalizada.destino.nome}`,
        label: { text: "D", color: "#ffffff", fontWeight: "700" },
        icon: { path: google.maps.SymbolPath.CIRCLE, scale: 10, fillColor: COR_ROTA, fillOpacity: 1, strokeColor: "#ffffff", strokeWeight: 2 },
      });
      markersRef.current.set("$origem", originMarker);
      markersRef.current.set("$destino", destinationMarker);
    }

    pontosComCoordenadas.forEach((ponto, indice) => {
      const position = { lat: ponto.latitude, lng: ponto.longitude };
      caminho.push(position);

      const marker = new google.maps.Marker({
        position,
        map,
        title: `${indice + 1}. ${ponto.nome}`,
        // O número é a ordem de visita, a mesma da lista ao lado.
        label: { text: String(indice + 1), color: "#ffffff", fontSize: "11px", fontWeight: "700" },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 11,
          fillColor: ponto.parada ? COR_ROTA : TRILHA_MARKER_COLOR[ponto.trilha] ?? COR_MARCADOR_DESCONHECIDO,
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        },
      });

      // Critério de aceite: clique no marcador mostra nome e trilha do ponto.
      marker.addListener("click", () => {
        abrirInfoWindow(ponto, marker);
        onSelecionarPontoRef.current?.(ponto.id);
      });

      markersRef.current.set(ponto.id, marker);
      const anterior = indice > 0 ? pontosComCoordenadas[indice - 1].nome : rotaNormalizada?.origem.nome;
      cartoesRef.current.set(ponto.id, montarCartaoDoPonto(ponto, indice + 1, anterior, transporte));
      bounds.extend(position);
    });

    // A Directions não aceita pontos intermediários no transporte público.
    if (rotaNormalizada && directionsKey && transporte !== "TRANSIT") {
      let active = true;
      const renderer = new google.maps.DirectionsRenderer({
        map,
        suppressMarkers: true,
        preserveViewport: true,
        polylineOptions: { strokeColor: COR_ROTA, strokeWeight: 5, strokeOpacity: 0.9 },
      });
      directionsRendererRef.current = renderer;

      void new google.maps.DirectionsService()
        .route({
          origin: { lat: rotaNormalizada.origem.latitude, lng: rotaNormalizada.origem.longitude },
          destination: { lat: rotaNormalizada.destino.latitude, lng: rotaNormalizada.destino.longitude },
          waypoints: pontosComCoordenadas.slice(0, 25).map((ponto) => ({
            location: { lat: ponto.latitude, lng: ponto.longitude },
            stopover: true,
          })),
          optimizeWaypoints: false,
          travelMode: transporte as google.maps.TravelMode,
        })
        .then((result) => {
          if (active) {
            renderer.setDirections(result);
            onErroRotaRef.current?.(null);
            setDirectionsConcluidas(directionsKey);
          }
        })
        .catch(() => {
          if (active) {
            onErroRotaRef.current?.("Não foi possível calcular a rota por ruas. Os pontos continuam disponíveis no mapa.");
            setDirectionsConcluidas(directionsKey);
          }
        });

      map.fitBounds(bounds, 48);

      return () => {
        active = false;
        renderer.setMap(null);
      };
    }

    if (caminho.length > 1) {
      polylineRef.current = new google.maps.Polyline({
        path: caminho,
        map,
        strokeColor: COR_ROTA,
        strokeWeight: 3,
        strokeOpacity: 0.85,
      });
    }

    if (pontosComCoordenadas.length === 1) {
      map.setCenter(bounds.getCenter());
      map.setZoom(14);
    } else {
      map.fitBounds(bounds, 48);
    }
  }, [carregado, pontosComCoordenadas, rotaNormalizada, directionsKey, transporte]);

  // Reage à seleção feita fora do mapa (ex: clique num item da lista):
  // centraliza e abre o balão do ponto correspondente.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !pontoSelecionadoId) return;

    const marker = markersRef.current.get(pontoSelecionadoId);
    const ponto = pontosComCoordenadas.find((p) => p.id === pontoSelecionadoId);
    if (!marker || !ponto) return;

    map.panTo({ lat: ponto.latitude, lng: ponto.longitude });
    abrirInfoWindow(ponto, marker);
  }, [pontoSelecionadoId, pontosComCoordenadas]);

  const classesBorda = semBorda ? "" : "rounded-lg border border-[#d5d9d7]";
  const classesBordaTracejada = semBorda
    ? ""
    : "rounded-lg border border-dashed border-[#d5d9d7]";

  if (erro) {
    return (
      <div
        role="alert"
        className={`flex ${altura} w-full flex-col items-center justify-center gap-1 ${classesBordaTracejada} bg-[#f4f5f4] p-4 text-center text-sm text-[#56636c]`}
      >
        <p className="font-medium text-[#263d44]">
          Não foi possível carregar o mapa.
        </p>
        <p>{erro}</p>
      </div>
    );
  }

  if (!carregado) {
    return (
      <div
        role="status"
        className={`flex ${altura} w-full items-center justify-center ${classesBorda} bg-[#f4f5f4] text-sm text-[#56636c]`}
      >
        Carregando mapa...
      </div>
    );
  }

  if (pontosComCoordenadas.length === 0 && !rotaNormalizada) {
    return (
      <div
        className={`flex ${altura} w-full items-center justify-center ${classesBordaTracejada} p-4 text-center text-sm text-[#56636c]`}
      >
        Nenhum ponto com coordenadas para exibir no mapa.
      </div>
    );
  }

  return (
    <div className={`relative ${altura} w-full overflow-hidden ${classesBorda}`}>
      <div
        ref={containerRef}
        role="img"
        aria-label="Mapa com os pontos do roteiro e a rota por ruas"
        className="absolute inset-0"
      />
      {rotaCarregando && (
        <div className="absolute left-3 top-3 rounded bg-white px-3 py-2 text-sm text-[#263d44] shadow" role="status">
          Calculando trajeto pelas ruas…
        </div>
      )}
    </div>
  );
}


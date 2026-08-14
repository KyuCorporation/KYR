"use client";

import { useEffect, useMemo, useRef } from "react";
import { PontoDeInteresse, Trilha } from "@/types/roteiro";
import { useGoogleMapsScript } from "@/hooks/useGoogleMapsScript";

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

const TRILHA_LABEL: Record<Trilha, string> = {
  turismo: "Turismo",
  compras: "Compras",
};

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
}

export default function RoteiroMap({
  pontos,
  pontoSelecionadoId = null,
  onSelecionarPonto,
  altura = "h-72",
  semBorda = false,
}: RoteiroMapProps) {
  const { carregado, erro } = useGoogleMapsScript();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const onSelecionarPontoRef = useRef(onSelecionarPonto);

  useEffect(() => {
    onSelecionarPontoRef.current = onSelecionarPonto;
  }, [onSelecionarPonto]);

  // useMemo evita recriar essa lista (e disparar o efeito abaixo) em todo
  // re-render — só recalcula quando o array `pontos` realmente muda.
  const pontosComCoordenadas = useMemo(() => pontos.filter(temCoordenadas), [pontos]);

  function abrirInfoWindow(ponto: PontoComCoordenadas, marker: google.maps.Marker) {
    const map = mapRef.current;
    if (!infoWindowRef.current || !map) return;
    infoWindowRef.current.setContent(
      `<div style="font-family: Arial, sans-serif; padding: 2px 4px;">
         <strong>${escapeHtml(ponto.nome)}</strong><br/>
         <span>${escapeHtml(TRILHA_LABEL[ponto.trilha] ?? ponto.trilha)}</span>
       </div>`
    );
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
    polylineRef.current?.setMap(null);
    polylineRef.current = null;

    if (pontosComCoordenadas.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    const caminho: google.maps.LatLngLiteral[] = [];

    pontosComCoordenadas.forEach((ponto) => {
      const position = { lat: ponto.latitude, lng: ponto.longitude };
      caminho.push(position);

      const marker = new google.maps.Marker({
        position,
        map,
        title: ponto.nome,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: TRILHA_MARKER_COLOR[ponto.trilha] ?? COR_MARCADOR_DESCONHECIDO,
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
      bounds.extend(position);
    });

    // Linha conectando os pontos na ordem do roteiro (o "caminho" pedido).
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
  }, [carregado, pontosComCoordenadas]);

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

  const classesBorda = semBorda ? "" : "rounded-lg border border-zinc-200 dark:border-zinc-800";
  const classesBordaTracejada = semBorda
    ? ""
    : "rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700";

  if (erro) {
    return (
      <div
        role="alert"
        className={`flex ${altura} w-full flex-col items-center justify-center gap-1 ${classesBordaTracejada} bg-zinc-50 p-4 text-center text-sm text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400`}
      >
        <p className="font-medium text-zinc-700 dark:text-zinc-200">
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
        className={`flex ${altura} w-full items-center justify-center ${classesBorda} bg-zinc-50 text-sm text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400`}
      >
        Carregando mapa...
      </div>
    );
  }

  if (pontosComCoordenadas.length === 0) {
    return (
      <div
        className={`flex ${altura} w-full items-center justify-center ${classesBordaTracejada} p-4 text-center text-sm text-zinc-500 dark:text-zinc-400`}
      >
        Nenhum ponto com coordenadas para exibir no mapa.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label="Mapa com os pontos do roteiro"
      className={`${altura} w-full overflow-hidden ${classesBorda}`}
    />
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
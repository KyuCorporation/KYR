"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPinLine } from "@phosphor-icons/react";
import { ApiError, type ApiRequestStatus } from "@/core/api";
import { gerarRoteiro } from "@/core/gerarRoteiro";
import styles from "./page.module.css";
import RouteMapIllustration from "./RouteMapIllustration";
import GoogleMapRoute, { type RouteInfo, type TravelModeKey } from "./GoogleMapRoute";
import LocationField, { type LocationFieldValue } from "./LocationField";
import type { Place } from "./mockPlaces";
import {
  BackArrowIcon,
  PlusIcon,
  CarIcon,
  WalkIcon,
  BikeIcon,
  BusIcon,
  BulbIcon,
  WarningIcon,
} from "./icons";

type TransportMode = "car" | "walk" | "bike" | "transit";

const TRANSPORT_OPTIONS: { id: TransportMode; label: string; icon: React.ReactNode }[] = [
  { id: "car", label: "Carro", icon: <CarIcon /> },
  { id: "walk", label: "Caminhada", icon: <WalkIcon /> },
  { id: "bike", label: "Bicicleta", icon: <BikeIcon /> },
  { id: "transit", label: "Transporte Público", icon: <BusIcon /> },
];

// Mapeia o modo de transporte da tela para o enum aceito pela Directions API.
const TRAVEL_MODE_MAP: Record<TransportMode, TravelModeKey> = {
  car: "DRIVING",
  walk: "WALKING",
  bike: "BICYCLING",
  transit: "TRANSIT",
};

const EMPTY_FIELD: LocationFieldValue = { text: "", place: null };

/** Retorna "1ª", "2ª", "3ª"... (concorda com "parada", que é feminino). */
function ordinal(n: number) {
  return `${n}ª`;
}

function isPlace(value: unknown): value is Place {
  if (typeof value !== "object" || value === null) return false;
  const place = value as Record<string, unknown>;
  return typeof place.id === "string"
    && typeof place.name === "string"
    && typeof place.latitude === "number"
    && typeof place.longitude === "number"
    && Array.isArray(place.categories)
    && typeof place.tempoMin === "number"
    && typeof place.distanciaKm === "number";
}

export default function CriarRoteiroPage() {
  const router = useRouter();

  const [origem, setOrigem] = useState<LocationFieldValue>(EMPTY_FIELD);
  const [destino, setDestino] = useState<LocationFieldValue>(EMPTY_FIELD);
  const [paradas, setParadas] = useState<LocationFieldValue[]>([]);
  const [transporte, setTransporte] = useState<TransportMode>("car");
  const [tentouGerar, setTentouGerar] = useState(false);
  const [realRouteInfo, setRealRouteInfo] = useState<RouteInfo | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestStatus, setRequestStatus] = useState<ApiRequestStatus>("requesting");
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const stored = window.sessionStorage.getItem("kyr:pending-destination");
        if (!stored) return;
        window.sessionStorage.removeItem("kyr:pending-destination");
        const candidate: unknown = JSON.parse(stored);
        if (!isPlace(candidate)) return;
        setParadas((current) => [...current, { text: candidate.name, place: candidate }]);
      } catch {
        window.sessionStorage.removeItem("kyr:pending-destination");
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const temMapaReal = Boolean(apiKey);

  const handleAdicionarParada = () => {
    setParadas((prev) => [...prev, EMPTY_FIELD]);
  };

  const handleParadaChange = (index: number, value: LocationFieldValue) => {
    setParadas((prev) => prev.map((p, i) => (i === index ? value : p)));
  };

  // Endereços/nomes usados pela Directions API (Maps real).
  const origemEndereco = origem.place?.name ?? "";
  const destinoEndereco = destino.place?.name ?? "";
  const paradasEnderecos = paradas
    .map((p) => p.place?.name)
    .filter((name): name is string => Boolean(name));

  // Soma mockada: cada lugar selecionado (origem, destino, paradas) tem um
  // tempo/distância fixo, e o total é apenas a soma dos selecionados.
  // Usada como fallback enquanto a chave do Google Maps não está configurada,
  // ou se a Directions API real ainda não retornou um resultado.
  const { tempoTotal: tempoMock, distanciaTotal: distanciaMock } = useMemo(() => {
    const selecionados = [origem, destino, ...paradas]
      .map((f) => f.place)
      .filter((p): p is NonNullable<typeof p> => p !== null);

    if (selecionados.length === 0) {
      return { tempoTotal: "--", distanciaTotal: "--" };
    }

    const minutos = selecionados.reduce((acc, p) => acc + p.tempoMin, 0);
    const km = selecionados.reduce((acc, p) => acc + p.distanciaKm, 0);

    const horas = Math.floor(minutos / 60);
    const minutosRestantes = minutos % 60;
    const tempoFormatado =
      horas > 0 ? `${horas}h ${minutosRestantes}min` : `${minutosRestantes} min`;

    return { tempoTotal: tempoFormatado, distanciaTotal: `${km} km` };
  }, [origem, destino, paradas]);

  // Quando o mapa real está ativo e já calculou uma rota, usamos os valores
  // reais da Directions API. Caso contrário, caímos no valor mockado.
  const tempoTotal = temMapaReal && realRouteInfo ? realRouteInfo.durationText : tempoMock;
  const distanciaTotal =
    temMapaReal && realRouteInfo ? realRouteInfo.distanceText : distanciaMock;

  const handleCancelar = () => {
    router.push("/");
  };

  const handleVoltar = () => {
    router.push("/");
  };

  const handleGerarRoteiro = async () => {
    setTentouGerar(true);
    setApiError(null);

    const origemSelecionada = origem.place;
    const destinoSelecionado = destino.place;
    const paradasValidas = paradas.every((p) => p.text.trim() === "" || p.place !== null);

    if (!origemSelecionada || !destinoSelecionado || !paradasValidas) {
      return;
    }

    setIsSubmitting(true);
    setRequestStatus("requesting");

    try {
      const resultado = await gerarRoteiro(
        {
          origem: {
            nome: origemSelecionada.name,
            latitude: origemSelecionada.latitude,
            longitude: origemSelecionada.longitude,
          },
          destino: {
            nome: destinoSelecionado.name,
            latitude: destinoSelecionado.latitude,
            longitude: destinoSelecionado.longitude,
          },
        },
        { onStatusChange: setRequestStatus },
      );

      window.sessionStorage.setItem("kyr:last-roteiro", JSON.stringify(resultado));
      router.push("/roteiro/resultado");
    } catch (error) {
      setApiError(
        error instanceof ApiError
          ? error.message
          : "Não foi possível gerar o roteiro. Tente novamente.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {/* Coluna esquerda: formulário */}
        <section className={styles.formColumn}>
          <header className={styles.header}>
            <button
              className={styles.backButton}
              type="button"
              aria-label="Voltar para a home"
              onClick={handleVoltar}
            >
              <BackArrowIcon />
              <span>Criar roteiro</span>
            </button>
            <span className={styles.step}>Etapa 1 de 2</span>
          </header>

          <LocationField
            id="origem"
            label="Origem"
            placeholder="Onde você está agora?"
            value={origem}
            onChange={setOrigem}
            forceValidate={tentouGerar}
            errorMessage="Informe a origem"
          />

          <LocationField
            id="destino"
            label="Destino"
            placeholder="Para onde deseja viajar?"
            value={destino}
            onChange={setDestino}
            forceValidate={tentouGerar}
            errorMessage="Informe o destino"
          />

          {paradas.map((parada, index) => (
            <LocationField
              key={index}
              id={`parada-${index}`}
              label={`${ordinal(index + 1)} Parada`}
              placeholder={`Onde será sua ${ordinal(index + 1)} parada?`}
              value={parada}
              onChange={(value) => handleParadaChange(index, value)}
              forceValidate={tentouGerar}
              errorMessage="Informe um endereço válido para a parada"
            />
          ))}

          <button
            type="button"
            className={styles.addStopButton}
            onClick={handleAdicionarParada}
          >
            <PlusIcon />
            Adicionar parada
          </button>

          <div className={styles.field}>
            <span className={styles.label}>Meio de transporte</span>
            <div className={styles.transportGrid}>
              {TRANSPORT_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`${styles.transportCard} ${
                    transporte === option.id ? styles.transportCardActive : ""
                  }`}
                  onClick={() => setTransporte(option.id)}
                  aria-pressed={transporte === option.id}
                >
                  <span className={styles.transportIcon}>{option.icon}</span>
                  <span className={styles.transportLabel}>{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className={styles.summaryRow}>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Tempo estimado</span>
              <span className={styles.summaryValue}>{tempoTotal}</span>
            </div>
            <div className={styles.summaryDivider} />
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Distância</span>
              <span className={styles.summaryValue}>{distanciaTotal}</span>
            </div>
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.cancelButton} onClick={handleCancelar}>
              Cancelar
            </button>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => void handleGerarRoteiro()}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Gerando…" : apiError ? "Tentar novamente" : "Gerar roteiro"}
              <span className={styles.arrow}>→</span>
            </button>
          </div>
          {apiError && <p className={styles.apiError} role="alert" aria-live="assertive">{apiError}</p>}
          {(paradas.some((parada) => parada.place !== null) || transporte !== "car") && (
            <p className={styles.requestStatus}>
              A API atual recebe apenas origem e destino; paradas e meio de transporte ainda não fazem parte do contrato.
            </p>
          )}
        </section>

        {/* Coluna direita: mapa + dica */}
        <section className={styles.mapColumn}>
          <div className={styles.mapArea}>
            {temMapaReal ? (
              <GoogleMapRoute
                apiKey={apiKey as string}
                origin={origemEndereco}
                destination={destinoEndereco}
                waypoints={paradasEnderecos}
                travelMode={TRAVEL_MODE_MAP[transporte]}
                onRouteInfo={setRealRouteInfo}
                onError={setRouteError}
              />
            ) : (
              <RouteMapIllustration tempo={tempoTotal} distancia={distanciaTotal} />
            )}
          </div>

          <div className={styles.tipCard}>
            <span className={styles.tipIcon}>
              <BulbIcon />
            </span>
            <p className={styles.tipText}>
              <strong>Dica da Kyr :</strong>
              <br />
              Você pode adicionar paradas e personalizar sua rota na próxima
              etapa.
            </p>
          </div>

          {temMapaReal && routeError && (
            <div className={styles.routeErrorCard}>
              <WarningIcon />
              <p className={styles.routeErrorText}>{routeError}</p>
            </div>
          )}
          <p className={styles.mapAttribution}>
            Coordenadas do catálogo demonstrativo: <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a>
          </p>
        </section>
      </div>
      {isSubmitting && (
        <div className={styles.loadingScreen} role="status" aria-live="polite">
          <div className={styles.loadingIcon}><MapPinLine size={72} weight="fill" aria-hidden="true" /></div>
          <h2>Gerando seu roteiro…</h2>
          <p>
            {requestStatus === "waking-server"
              ? "Acordando o servidor… isso pode levar alguns segundos."
              : "Estamos calculando a melhor rota para você."}
          </p>
        </div>
      )}
    </div>
  );
}
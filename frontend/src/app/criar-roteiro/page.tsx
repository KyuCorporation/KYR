"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";
import RouteMapIllustration from "./RouteMapIllustration";
import GoogleMapRoute, { type RouteInfo, type TravelModeKey } from "./GoogleMapRoute";
import LocationField, { type LocationFieldValue } from "./LocationField";
import {
  BackArrowIcon,
  PlusIcon,
  CarIcon,
  WalkIcon,
  BikeIcon,
  MotoIcon,
  BulbIcon,
  WarningIcon,
} from "./icons";

type TransportMode = "car" | "walk" | "bike" | "moto";

const TRANSPORT_OPTIONS: { id: TransportMode; label: string; icon: React.ReactNode }[] = [
  { id: "car", label: "Carro", icon: <CarIcon /> },
  { id: "walk", label: "Caminhada", icon: <WalkIcon /> },
  { id: "bike", label: "Bicicleta", icon: <BikeIcon /> },
  { id: "moto", label: "Moto", icon: <MotoIcon /> },
];

// Mapeia o modo de transporte da tela para o enum aceito pela Directions API.
// A Directions API do Google não tem um modo específico para moto, então
// usamos DRIVING (rotas de veículo motorizado) como equivalente mais próximo.
const TRAVEL_MODE_MAP: Record<TransportMode, TravelModeKey> = {
  car: "DRIVING",
  walk: "WALKING",
  bike: "BICYCLING",
  moto: "DRIVING",
};

const EMPTY_FIELD: LocationFieldValue = { text: "", place: null };

/** Retorna "1ª", "2ª", "3ª"... (concorda com "parada", que é feminino). */
function ordinal(n: number) {
  return `${n}ª`;
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

  const handleGerarRoteiro = () => {
    setTentouGerar(true);

    const origemValida = origem.place !== null;
    const destinoValido = destino.place !== null;
    const paradasValidas = paradas.every((p) => p.text.trim() === "" || p.place !== null);

    if (!origemValida || !destinoValido || !paradasValidas) {
      return;
    }

    // Aqui entraria a navegação para a etapa 2 / chamada real de rota.
    console.log({ origem, destino, transporte, paradas });
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
            <button type="button" className={styles.primaryButton} onClick={handleGerarRoteiro}>
              Gerar roteiro
              <span className={styles.arrow}>→</span>
            </button>
          </div>
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
        </section>
      </div>
    </div>
  );
}
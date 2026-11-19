import { apiFetch, type ApiRequestStatus } from "@/core/api";
import type {
  FonteRota,
  Transporte,
  LocalRoteiro,
  Metadados,
  PontoDeInteresse,
  RoteiroResponse,
  Trilha,
  TipoPonto,
} from "@/types/roteiro";

export interface RoteiroParams {
  origem: LocalRoteiro;
  destino: LocalRoteiro;
  /** Paradas escolhidas, na ordem informada. */
  paradas?: LocalRoteiro[];
  transporte?: Transporte;
}

const TRANSPORTES: Transporte[] = ["DRIVING", "WALKING", "BICYCLING", "TRANSIT"];

export interface GerarRoteiroOptions {
  onStatusChange?: (status: ApiRequestStatus) => void;
}

export async function gerarRoteiro(
  params: RoteiroParams,
  options: GerarRoteiroOptions = {},
): Promise<RoteiroResponse> {
  const response = await apiFetch<unknown>("/api/roteiros", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      origem: params.origem,
      destino: params.destino,
      // Só envia o que foi escolhido: sem paradas e de carro, o corpo é o mesmo de antes.
      ...(params.paradas && params.paradas.length > 0 ? { paradas: params.paradas } : {}),
      ...(params.transporte && params.transporte !== "DRIVING" ? { transporte: params.transporte } : {}),
    }),
    onStatusChange: options.onStatusChange,
  });

  return normalizarRoteiroResponse(response, params.origem, params.destino);
}

export function normalizarRoteiroResponse(
  value: unknown,
  origem: LocalRoteiro,
  destino: LocalRoteiro,
): RoteiroResponse {
  if (!isRecord(value) || !Array.isArray(value.pontos)) {
    throw new Error("O servidor retornou um roteiro em formato inválido.");
  }

  const pontos = value.pontos.flatMap((item, index) => {
    if (!isRecord(item) || typeof item.nome !== "string" || !item.nome.trim()) {
      return [];
    }

    return [normalizarPonto(item, index)];
  });
  const rawMetadata = isRecord(value.metadados) ? value.metadados : {};
  const metadados: Metadados = {
    totalPontos: finiteNumber(rawMetadata.totalPontos) ?? pontos.length,
    tempoRespostaMs: finiteNumber(rawMetadata.tempoRespostaMs),
    fonteIA: stringValue(rawMetadata.fonteIA),
    curadoPorIa: rawMetadata.curadoPorIa === true,
    fonteRota: stringValue(rawMetadata.fonteRota) as FonteRota | "",
    transporte: TRANSPORTES.includes(rawMetadata.transporte as Transporte) ? (rawMetadata.transporte as Transporte) : "DRIVING",
  };

  return { origem, destino, metadados, pontos };
}

function normalizarPonto(
  item: Record<string, unknown>,
  index: number,
): PontoDeInteresse {
  const nome = item.nome as string;
  const trilha = stringValue(item.trilha);
  const tipo = stringValue(item.tipo);

  return {
    id: `poi-${index + 1}-${slugify(nome)}`,
    nome,
    trilha: (trilha || "desconhecida") as Trilha,
    tipo: (tipo || "desconhecido") as TipoPonto,
    endereco: stringValue(item.endereco),
    latitude: finiteNumber(item.latitude),
    longitude: finiteNumber(item.longitude),
    fonte: stringValue(item.fonte),
    descricao: stringValue(item.descricao),
    // Backends antigos não mandam "curado": nesse caso vale ter trilha e tipo preenchidos.
    curado: typeof item.curado === "boolean" ? item.curado : Boolean(trilha && tipo),
    distanciaMetros: finiteNumber(item.distanciaMetros),
    duracaoSegundos: finiteNumber(item.duracaoSegundos),
    placeId: stringValue(item.placeId) || null,
    parada: item.parada === true,
  };
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
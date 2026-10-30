import { apiFetch, type ApiRequestStatus } from "@/core/api";
import type {
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
}

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
    body: JSON.stringify({ origem: params.origem, destino: params.destino }),
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
  };

  return { origem, destino, metadados, pontos };
}

function normalizarPonto(
  item: Record<string, unknown>,
  index: number,
): PontoDeInteresse {
  const nome = item.nome as string;

  return {
    id: `poi-${index + 1}-${slugify(nome)}`,
    nome,
    trilha: (stringValue(item.trilha) || "desconhecida") as Trilha,
    tipo: (stringValue(item.tipo) || "desconhecido") as TipoPonto,
    endereco: stringValue(item.endereco),
    latitude: finiteNumber(item.latitude),
    longitude: finiteNumber(item.longitude),
    fonte: stringValue(item.fonte),
    descricao: stringValue(item.descricao),
    distanciaMetros: finiteNumber(item.distanciaMetros),
    duracaoSegundos: finiteNumber(item.duracaoSegundos),
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
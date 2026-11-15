import type { LocalRoteiro, RoteiroResponse } from "@/types/roteiro";

const STORAGE_KEY = "kyr:roteiros-salvos";

export interface RoteiroSalvo {
  id: string;
  origem: LocalRoteiro;
  destino: LocalRoteiro;
  pontos: string[];
  destinosAdicionados: string[];
  criadoEm: string;
}

export function lerRoteirosSalvos(): RoteiroSalvo[] {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const value: unknown = stored ? JSON.parse(stored) : [];
    return Array.isArray(value) ? value.filter(isRoteiroSalvo) : [];
  } catch {
    return [];
  }
}

export function salvarRoteiro(roteiro: RoteiroResponse): RoteiroSalvo {
  const saved: RoteiroSalvo = {
    id: crypto.randomUUID(),
    origem: roteiro.origem,
    destino: roteiro.destino,
    pontos: roteiro.pontos.map((ponto) => ponto.nome),
    destinosAdicionados: [],
    criadoEm: new Date().toISOString(),
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([saved, ...lerRoteirosSalvos()]));
  return saved;
}

export function adicionarDestinoAoRoteiro(roteiroId: string, destinoSlug: string): void {
  const updated = lerRoteirosSalvos().map((roteiro) => {
    if (roteiro.id !== roteiroId || roteiro.destinosAdicionados.includes(destinoSlug)) return roteiro;
    return { ...roteiro, destinosAdicionados: [...roteiro.destinosAdicionados, destinoSlug] };
  });
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function removerRoteiro(roteiroId: string): void {
  const restantes = lerRoteirosSalvos().filter((roteiro) => roteiro.id !== roteiroId);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(restantes));
}

function isRoteiroSalvo(value: unknown): value is RoteiroSalvo {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return typeof record.id === "string"
    && isLocalRoteiro(record.origem)
    && isLocalRoteiro(record.destino)
    && Array.isArray(record.pontos)
    && Array.isArray(record.destinosAdicionados)
    && typeof record.criadoEm === "string";
}

function isLocalRoteiro(value: unknown): value is LocalRoteiro {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return typeof record.nome === "string"
    && typeof record.latitude === "number"
    && typeof record.longitude === "number";
}
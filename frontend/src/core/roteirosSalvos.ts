import { ApiError, apiFetch } from "@/core/api";
import { esquecerSessao, lerSessao } from "@/core/sessao";
import type { LocalRoteiro, RoteiroResponse } from "@/types/roteiro";

// Roteiros salvos. Com conta, ficam no servidor; sem conta, só neste navegador (localStorage).
//
// O que NÃO é guardado: nome, endereço e nota dos lugares sugeridos. Os termos do Google Maps só deixam
// guardar o ID do lugar (sem prazo) e latitude/longitude (por até 30 dias). Por isso um roteiro salvo
// guarda os IDs dos lugares e quantos eram, mais a origem e o destino escolhidos (nome e coordenadas),
// que costumam vir das sugestões do Google e por isso são apagados em 30 dias. Para ver os lugares de
// novo, o roteiro é gerado outra vez ("Abrir roteiro").

const STORAGE_KEY = "kyr:roteiros-salvos";
export const DIAS_DE_VALIDADE_DAS_COORDENADAS = 30;

export interface LocalSalvo {
  nome: string;
  latitude: number | null;
  longitude: number | null;
}

export interface RoteiroSalvo {
  id: string;
  origem: LocalSalvo;
  destino: LocalSalvo;
  totalPontos: number;
  placeIds: string[];
  destinosAdicionados: string[];
  criadoEm: string;
  /** false quando as coordenadas já foram apagadas (mais de 30 dias). */
  podeReabrir: boolean;
  /** "conta" = guardado no servidor; "dispositivo" = só neste navegador. */
  onde: "conta" | "dispositivo";
}

// ---------- Neste navegador ----------

function vencido(criadoEm: string): boolean {
  const data = new Date(criadoEm).getTime();
  return Number.isNaN(data) || Date.now() - data > DIAS_DE_VALIDADE_DAS_COORDENADAS * 24 * 60 * 60 * 1000;
}

function lerLocal(valor: unknown): LocalSalvo | null {
  if (typeof valor !== "object" || valor === null) return null;
  const registro = valor as Record<string, unknown>;
  if (typeof registro.nome !== "string") return null;
  return {
    nome: registro.nome,
    latitude: typeof registro.latitude === "number" ? registro.latitude : null,
    longitude: typeof registro.longitude === "number" ? registro.longitude : null,
  };
}

function temCoordenadas(local: LocalSalvo): boolean {
  return local.latitude !== null && local.longitude !== null;
}

// Aceita também o formato antigo (que guardava os nomes dos lugares em "pontos") e descarta esses nomes.
function lerRegistroLocal(valor: unknown): RoteiroSalvo | null {
  if (typeof valor !== "object" || valor === null) return null;
  const registro = valor as Record<string, unknown>;
  const origem = lerLocal(registro.origem);
  const destino = lerLocal(registro.destino);
  if (typeof registro.id !== "string" || !origem || !destino || typeof registro.criadoEm !== "string") return null;

  // Vencido o prazo, some a origem e o destino inteiros: o nome costuma vir das sugestões do Google.
  const semCoordenadas = vencido(registro.criadoEm);
  const limpar = (local: LocalSalvo): LocalSalvo => (semCoordenadas ? { nome: "", latitude: null, longitude: null } : local);
  const origemFinal = limpar(origem);
  const destinoFinal = limpar(destino);
  const pontosAntigos = Array.isArray(registro.pontos) ? registro.pontos.length : 0;

  return {
    id: registro.id,
    origem: origemFinal,
    destino: destinoFinal,
    totalPontos: typeof registro.totalPontos === "number" ? registro.totalPontos : pontosAntigos,
    placeIds: Array.isArray(registro.placeIds) ? registro.placeIds.filter((id): id is string => typeof id === "string") : [],
    destinosAdicionados: Array.isArray(registro.destinosAdicionados)
      ? registro.destinosAdicionados.filter((slug): slug is string => typeof slug === "string")
      : [],
    criadoEm: registro.criadoEm,
    podeReabrir: temCoordenadas(origemFinal) && temCoordenadas(destinoFinal),
    onde: "dispositivo",
  };
}

export function lerRoteirosDoDispositivo(): RoteiroSalvo[] {
  try {
    const guardado = window.localStorage.getItem(STORAGE_KEY);
    const valor: unknown = guardado ? JSON.parse(guardado) : [];
    const roteiros = Array.isArray(valor)
      ? valor.map(lerRegistroLocal).filter((roteiro): roteiro is RoteiroSalvo => roteiro !== null)
      : [];
    // Regrava já sem os nomes de lugares do formato antigo e sem coordenadas vencidas.
    gravarNoDispositivo(roteiros);
    return roteiros;
  } catch {
    return [];
  }
}

function gravarNoDispositivo(roteiros: RoteiroSalvo[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(roteiros));
  } catch {
    // Sem espaço ou sem permissão: o roteiro só não fica guardado.
  }
}

function montar(roteiro: RoteiroResponse): Pick<RoteiroSalvo, "origem" | "destino" | "totalPontos" | "placeIds"> {
  return {
    origem: roteiro.origem,
    destino: roteiro.destino,
    totalPontos: roteiro.pontos.length,
    placeIds: roteiro.pontos.map((ponto) => ponto.placeId).filter((id): id is string => Boolean(id)),
  };
}

// ---------- Na conta ----------

interface RoteiroDaConta {
  id: number;
  origem: LocalSalvo;
  destino: LocalSalvo;
  totalPontos: number;
  placeIds: string[];
  criadoEm: string;
  podeReabrir: boolean;
}

function daConta(roteiro: RoteiroDaConta): RoteiroSalvo {
  return {
    id: String(roteiro.id),
    origem: roteiro.origem,
    destino: roteiro.destino,
    totalPontos: roteiro.totalPontos,
    placeIds: roteiro.placeIds ?? [],
    destinosAdicionados: [],
    criadoEm: roteiro.criadoEm,
    podeReabrir: roteiro.podeReabrir,
    onde: "conta",
  };
}

function sessaoExpirou(erro: unknown): boolean {
  if (erro instanceof ApiError && erro.status === 401) {
    esquecerSessao();
    return true;
  }
  return false;
}

// ---------- Usado pelas telas ----------

/** Roteiros da conta (se houver login) seguidos dos que estão só neste navegador. */
export async function listarRoteirosSalvos(): Promise<RoteiroSalvo[]> {
  const locais = lerRoteirosDoDispositivo();
  if (!lerSessao()) return locais;
  try {
    const daApi = await apiFetch<RoteiroDaConta[]>("/api/roteiros-salvos");
    return [...daApi.map(daConta), ...locais];
  } catch (erro) {
    if (sessaoExpirou(erro)) return locais;
    throw erro;
  }
}

export async function salvarRoteiro(roteiro: RoteiroResponse): Promise<RoteiroSalvo> {
  const dados = montar(roteiro);

  if (lerSessao()) {
    try {
      const salvo = await apiFetch<RoteiroDaConta>("/api/roteiros-salvos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ origem: dados.origem, destino: dados.destino, placeIds: dados.placeIds.slice(0, 25) }),
      });
      return daConta(salvo);
    } catch (erro) {
      // Sessão vencida: salva neste navegador em vez de perder o roteiro.
      if (!sessaoExpirou(erro)) throw erro;
    }
  }

  const salvo: RoteiroSalvo = {
    id: crypto.randomUUID(),
    ...dados,
    destinosAdicionados: [],
    criadoEm: new Date().toISOString(),
    podeReabrir: true,
    onde: "dispositivo",
  };
  gravarNoDispositivo([salvo, ...lerRoteirosDoDispositivo()]);
  return salvo;
}

export async function removerRoteiro(roteiro: Pick<RoteiroSalvo, "id" | "onde">): Promise<void> {
  if (roteiro.onde === "conta") {
    await apiFetch(`/api/roteiros-salvos/${roteiro.id}`, { method: "DELETE" });
    return;
  }
  gravarNoDispositivo(lerRoteirosDoDispositivo().filter((salvo) => salvo.id !== roteiro.id));
}

/** Liga um destino do catálogo do Kyr a um roteiro guardado neste navegador. */
export function adicionarDestinoAoRoteiro(roteiroId: string, destinoSlug: string): void {
  gravarNoDispositivo(lerRoteirosDoDispositivo().map((roteiro) => {
    if (roteiro.id !== roteiroId || roteiro.destinosAdicionados.includes(destinoSlug)) return roteiro;
    return { ...roteiro, destinosAdicionados: [...roteiro.destinosAdicionados, destinoSlug] };
  }));
}

/** Origem e destino prontos para gerar o roteiro de novo, ou null se as coordenadas já venceram. */
export function paraReabrir(roteiro: RoteiroSalvo): { origem: LocalRoteiro; destino: LocalRoteiro } | null {
  const { origem, destino } = roteiro;
  if (origem.latitude === null || origem.longitude === null || destino.latitude === null || destino.longitude === null) {
    return null;
  }
  return {
    origem: { nome: origem.nome, latitude: origem.latitude, longitude: origem.longitude },
    destino: { nome: destino.nome, latitude: destino.latitude, longitude: destino.longitude },
  };
}

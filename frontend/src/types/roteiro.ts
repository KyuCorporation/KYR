export type Trilha = "turismo" | "compras";
export type TipoPonto = "alimentacao" | "lazer";

export interface LocalRoteiro {
  nome: string;
  latitude: number;
  longitude: number;
}

export interface PontoDeInteresse {
  id: string;
  nome: string;
  trilha: Trilha;
  tipo: TipoPonto;
  endereco: string;
  latitude: number | null;
  longitude: number | null;
  fonte: string;
  descricao: string;
  /** false quando a IA não curou este ponto: trilha, tipo e descrição vêm vazios. */
  curado: boolean;
  distanciaMetros: number | null;
  duracaoSegundos: number | null;
}

export type FonteRota = "google-directions-api" | "fallback-sem-otimizacao";

export interface Metadados {
  totalPontos: number;
  tempoRespostaMs: number | null;
  /** Modelo que fez a curadoria, ou "sem-curadoria". */
  fonteIA: string;
  curadoPorIa: boolean;
  /** Vazio quando o backend não informou a fonte da ordenação. */
  fonteRota: FonteRota | "";
}

export interface RoteiroResponse {
  origem: LocalRoteiro;
  destino: LocalRoteiro;
  metadados: Metadados;
  pontos: PontoDeInteresse[];
}

export interface RespostaRoteiroApi {
  pontos: Array<{
    nome: string;
    trilha: string | null;
    tipo: string | null;
    endereco: string | null;
    latitude: number | null;
    longitude: number | null;
    fonte: string | null;
    descricao: string | null;
    curado: boolean;
    distanciaMetros: number | null;
    duracaoSegundos: number | null;
  }>;
  metadados: {
    totalPontos: number;
    tempoRespostaMs: number;
    fonteIA: string;
    curadoPorIa: boolean;
    fonteRota: FonteRota;
  };
}

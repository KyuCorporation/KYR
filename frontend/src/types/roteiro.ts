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
  distanciaMetros: number | null;
  duracaoSegundos: number | null;
}

export interface Metadados {
  totalPontos: number;
  tempoRespostaMs: number | null;
  fonteIA: string;
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
    trilha: string;
    tipo: string;
    endereco: string;
    latitude: number | null;
    longitude: number | null;
    fonte: string;
    descricao: string;
    distanciaMetros: number | null;
    duracaoSegundos: number | null;
  }>;
  metadados: Metadados;
}

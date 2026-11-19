export type Trilha = "turismo" | "compras";

/** Meio de transporte, com os nomes do modo de viagem da Directions API. */
export type Transporte = "DRIVING" | "WALKING" | "BICYCLING" | "TRANSIT";
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
  /** ID do lugar no Google Maps: o único dado do lugar que pode ser guardado sem prazo. */
  placeId: string | null;
  /** true quando é uma parada escolhida pela pessoa, e não um lugar sugerido. */
  parada: boolean;
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
  /** Meio de transporte das distâncias e tempos. */
  transporte: Transporte;
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
    placeId?: string | null;
    parada?: boolean;
    distanciaMetros: number | null;
    duracaoSegundos: number | null;
  }>;
  metadados: {
    totalPontos: number;
    tempoRespostaMs: number;
    fonteIA: string;
    curadoPorIa: boolean;
    fonteRota: FonteRota;
    transporte?: Transporte;
  };
}

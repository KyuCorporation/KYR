// Tipos alinhados ao contrato de API definido na US-04 (POST /roteiros).
// Quando o /docs/openapi.yaml estiver publicado, vale conferir se os campos
// abaixo continuam batendo exatamente com a especificação real.

export type Trilha = "turismo" | "compras";
export type TipoPonto = "alimentacao" | "lazer";

export interface PontoDeInteresse {
  id: string;
  nome: string;
  trilha: Trilha;
  tipo: TipoPonto;
  latitude?: number;
  longitude?: number;
  descricao?: string;
  fonte?: string;
}

export interface Metadados {
  origem: string;
  destino: string;
  geradoEm: string;
}

export interface RoteiroResponse {
  metadados: Metadados;
  pontos: PontoDeInteresse[];
}

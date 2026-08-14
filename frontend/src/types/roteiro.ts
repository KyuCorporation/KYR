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
  // Campos adicionados para US-20 (mapa), presentes no contrato real
  // (docs/openapi.yml) mas que a US-09 ainda não usava.
  endereco?: string;
  curado?: boolean;
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

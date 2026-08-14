export type Place = {
  id: string;
  name: string;
  /** Pequena descrição do lugar, usada em cards/tooltips. */
  description: string;
  /** Exatamente 2 categorias/tags do lugar (ex: "Turismo", "Lazer"). */
  categories: [string, string];
  /** Valor mockado usado só para simular o cálculo de rota (soma). */
  tempoMin: number;
  /** Valor mockado usado só para simular o cálculo de rota (soma). */
  distanciaKm: number;
};

/**
 * Lugares mockados para o autocomplete. Quando a API do Google Maps
 * (Places Autocomplete + Directions) for integrada, essa lista sai daqui
 * e passa a vir da API — o resto do fluxo (seleção, validação, soma de
 * tempo/distância) pode continuar praticamente igual.
 */
export const MOCK_PLACES: Place[] = [
  {
    id: "recife",
    name: "Recife - PE",
    description: "Capital de Pernambuco, conhecida pelos rios e pela arquitetura histórica.",
    categories: ["Turismo", "Cultura"],
    tempoMin: 25,
    distanciaKm: 12,
  },
  {
    id: "recife-antigo",
    name: "Recife Antigo - PE",
    description: "Bairro histórico à beira-mar, point de bares, música ao vivo e passeios de barco.",
    categories: ["Turismo", "Vida Noturna"],
    tempoMin: 15,
    distanciaKm: 6,
  },
  {
    id: "aeroporto-recife",
    name: "Aeroporto Internacional do Recife - PE",
    description: "Principal aeroporto de Pernambuco, porta de entrada para a região.",
    categories: ["Transporte", "Aeroporto"],
    tempoMin: 35,
    distanciaKm: 18,
  },
  {
    id: "shopping-recife",
    name: "Shopping Recife - PE",
    description: "Um dos maiores shoppings da cidade, com lojas, cinema e praça de alimentação.",
    categories: ["Compras", "Lazer"],
    tempoMin: 20,
    distanciaKm: 9,
  },
  {
    id: "olinda",
    name: "Olinda - PE",
    description: "Cidade histórica tombada pela UNESCO, famosa pelo Carnaval e pelas ladeiras coloridas.",
    categories: ["Turismo", "Cultura"],
    tempoMin: 30,
    distanciaKm: 15,
  },
  {
    id: "boa-viagem",
    name: "Boa Viagem - PE",
    description: "Praia urbana mais famosa do Recife, com orla extensa e boa estrutura.",
    categories: ["Praia", "Lazer"],
    tempoMin: 18,
    distanciaKm: 8,
  },
  {
    id: "candeias",
    name: "Candeias - PE",
    description: "Bairro litorâneo de Jaboatão dos Guararapes, com praia mais tranquila.",
    categories: ["Praia", "Lazer"],
    tempoMin: 22,
    distanciaKm: 11,
  },
  {
    id: "gravata",
    name: "Gravatá - PE",
    description: "Cidade serrana conhecida pelo clima ameno e pelas trilhas ecológicas.",
    categories: ["Turismo", "Natureza"],
    tempoMin: 60,
    distanciaKm: 84,
  },
  {
    id: "porto-de-galinhas",
    name: "Porto de Galinhas - PE",
    description: "Uma das praias mais famosas do Brasil, com piscinas naturais e recifes de coral.",
    categories: ["Praia", "Turismo"],
    tempoMin: 75,
    distanciaKm: 65,
  },
  {
    id: "caruaru",
    name: "Caruaru - PE",
    description: "Conhecida pelo maior São João do mundo e pela tradicional feira de artesanato.",
    categories: ["Cultura", "Compras"],
    tempoMin: 100,
    distanciaKm: 130,
  },
  {
    id: "agua-preta",
    name: "Água Preta - PE",
    description: "Cidade do interior de Pernambuco, cercada por engenhos e área rural.",
    categories: ["Natureza", "Turismo"],
    tempoMin: 90,
    distanciaKm: 110,
  },
];

export function searchPlaces(query: string): Place[] {
  const normalized = query.trim().toLowerCase();

  // Sem texto digitado ainda: mostra uma lista padrão de sugestões.
  if (!normalized) return MOCK_PLACES.slice(0, 6);

  return MOCK_PLACES.filter((place) =>
    place.name.toLowerCase().includes(normalized)
  ).slice(0, 6);
}
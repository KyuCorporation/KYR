export type Place = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  /** Pequena descrição do lugar, usada em cards/tooltips. */
  description: string;
  /** Exatamente 2 categorias/tags do lugar (ex: "Turismo", "Lazer"). */
  categories: [string, string];
  /** Valor mockado usado só para simular o cálculo de rota (soma). */
  tempoMin: number;
  /** Valor mockado usado só para simular o cálculo de rota (soma). */
  distanciaKm: number;
};

export const MOCK_PLACES: Place[] = [
  {
    id: "aeroporto-foz",
    name: "Aeroporto Internacional de Foz do Iguaçu - PR",
    latitude: -25.5930876,
    longitude: -54.4909835,
    description: "Principal porta de entrada aérea da região das Cataratas.",
    categories: ["Transporte", "Aeroporto"],
    tempoMin: 10,
    distanciaKm: 4,
  },
  {
    id: "grand-carima",
    name: "Grand Carimã Resort & Convention Center - PR",
    latitude: -25.5768507,
    longitude: -54.5485245,
    description: "Resort e centro de convenções na Avenida das Cataratas.",
    categories: ["Hospedagem", "Eventos"],
    tempoMin: 18,
    distanciaKm: 10,
  },
  {
    id: "cataratas-iguacu",
    name: "Cataratas do Iguaçu - PR",
    latitude: -25.693905,
    longitude: -54.4365376,
    description: "Quedas d'água no Parque Nacional do Iguaçu, Patrimônio Mundial Natural.",
    categories: ["Turismo", "Natureza"],
    tempoMin: 28,
    distanciaKm: 19,
  },
  {
    id: "parque-das-aves",
    name: "Parque das Aves - PR",
    latitude: -25.6150914,
    longitude: -54.4841325,
    description: "Refúgio de conservação de aves da Mata Atlântica, próximo às Cataratas.",
    categories: ["Turismo", "Natureza"],
    tempoMin: 24,
    distanciaKm: 16,
  },
  {
    id: "marco-tres-fronteiras",
    name: "Marco das Três Fronteiras - PR",
    latitude: -25.5901531,
    longitude: -54.5902488,
    description: "Ponto de encontro entre Brasil, Argentina e Paraguai.",
    categories: ["Turismo", "Cultura"],
    tempoMin: 22,
    distanciaKm: 12,
  },
  {
    id: "itaipu",
    name: "Usina Hidrelétrica de Itaipu - PR",
    latitude: -25.4095768,
    longitude: -54.5844935,
    description: "Complexo hidrelétrico binacional com visitas panorâmicas e técnicas.",
    categories: ["Turismo", "Engenharia"],
    tempoMin: 32,
    distanciaKm: 22,
  },
  {
    id: "templo-budista",
    name: "Templo Budista Chen Tien - PR",
    latitude: -25.4749664,
    longitude: -54.5989281,
    description: "Templo com jardins, esculturas e vista para o Rio Paraná.",
    categories: ["Turismo", "Cultura"],
    tempoMin: 25,
    distanciaKm: 14,
  },
  {
    id: "cataratas-jl",
    name: "Shopping Cataratas JL - PR",
    latitude: -25.5331327,
    longitude: -54.5751846,
    description: "Centro comercial com lojas, cinema e praça de alimentação.",
    categories: ["Compras", "Alimentação"],
    tempoMin: 18,
    distanciaKm: 9,
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
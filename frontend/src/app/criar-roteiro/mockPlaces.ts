export type Place = {
  id: string;
  name: string;
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
  { id: "recife", name: "Recife - PE", tempoMin: 25, distanciaKm: 12 },
  { id: "recife-antigo", name: "Recife Antigo - PE", tempoMin: 15, distanciaKm: 6 },
  {
    id: "aeroporto-recife",
    name: "Aeroporto Internacional do Recife - PE",
    tempoMin: 35,
    distanciaKm: 18,
  },
  { id: "shopping-recife", name: "Shopping Recife - PE", tempoMin: 20, distanciaKm: 9 },
  { id: "olinda", name: "Olinda - PE", tempoMin: 30, distanciaKm: 15 },
  { id: "boa-viagem", name: "Boa Viagem - PE", tempoMin: 18, distanciaKm: 8 },
  { id: "candeias", name: "Candeias - PE", tempoMin: 22, distanciaKm: 11 },
  { id: "gravata", name: "Gravatá - PE", tempoMin: 60, distanciaKm: 84 },
  { id: "porto-de-galinhas", name: "Porto de Galinhas - PE", tempoMin: 75, distanciaKm: 65 },
  { id: "caruaru", name: "Caruaru - PE", tempoMin: 100, distanciaKm: 130 },
  { id: "agua-preta", name: "Água Preta - PE", tempoMin: 90, distanciaKm: 110 },
];

export function searchPlaces(query: string): Place[] {
  const normalized = query.trim().toLowerCase();

  // Sem texto digitado ainda: mostra uma lista padrão de sugestões.
  if (!normalized) return MOCK_PLACES.slice(0, 6);

  return MOCK_PLACES.filter((place) =>
    place.name.toLowerCase().includes(normalized)
  ).slice(0, 6);
}
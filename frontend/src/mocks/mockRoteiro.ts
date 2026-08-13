import { RoteiroResponse } from "@/types/roteiro";

// Mock local para desenvolver a US-09 sem depender da US-05 estar pronta.
// Formato segue o contrato esperado da US-04 (POST /roteiros).
// Assim que o endpoint real existir, basta trocar esse mock pela chamada
// via core/api.ts, sem precisar mexer no componente da lista.

export const mockRoteiroComDados: RoteiroResponse = {
  metadados: {
    origem: "Aeroporto de Foz do Iguaçu",
    destino: "Evento (Centro de Convenções)",
    geradoEm: new Date().toISOString(),
  },
  pontos: [
    {
      id: "poi-01",
      nome: "Parque das Aves",
      trilha: "turismo",
      tipo: "lazer",
      descricao: "Santuário com aves nativas e exóticas, próximo às Cataratas.",
      latitude: -25.6685,
      longitude: -54.4384,
      endereco: "Av. das Cataratas, 12450 - Foz do Iguaçu - PR",
    },
    {
      id: "poi-02",
      nome: "Cataratas do Iguaçu",
      trilha: "turismo",
      tipo: "lazer",
      descricao: "Um dos principais atrativos naturais do Brasil.",
      latitude: -25.6953,
      longitude: -54.4367,
      endereco: "Bus Terminus - Rod. BR-469 - Km 18, Foz do Iguaçu - PR",
    },
    {
      id: "poi-03",
      nome: "Shopping Cataratas JL",
      trilha: "compras",
      tipo: "lazer",
      descricao: "Shopping com lojas e praça de alimentação.",
      latitude: -25.5236,
      longitude: -54.5793,
      endereco: "Av. Jorge Schimmelpfeng, 1385 - Foz do Iguaçu - PR",
    },
    {
      id: "poi-04",
      nome: "Rafain Churrascaria",
      trilha: "turismo",
      tipo: "alimentacao",
      descricao: "Restaurante típico com show latino-americano.",
      latitude: -25.5487,
      longitude: -54.5677,
      endereco: "Av. das Cataratas, 1749 - Foz do Iguaçu - PR",
    },
  ],
};

export const mockRoteiroVazio: RoteiroResponse = {
  metadados: {
    origem: "Aeroporto de Foz do Iguaçu",
    destino: "Evento (Centro de Convenções)",
    geradoEm: new Date().toISOString(),
  },
  pontos: [],
};

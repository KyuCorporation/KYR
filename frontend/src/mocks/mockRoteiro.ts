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
    },
    {
      id: "poi-02",
      nome: "Cataratas do Iguaçu",
      trilha: "turismo",
      tipo: "lazer",
      descricao: "Um dos principais atrativos naturais do Brasil.",
    },
    {
      id: "poi-03",
      nome: "Shopping Cataratas JL",
      trilha: "compras",
      tipo: "lazer",
      descricao: "Shopping com lojas e praça de alimentação.",
    },
    {
      id: "poi-04",
      nome: "Rafain Churrascaria",
      trilha: "turismo",
      tipo: "alimentacao",
      descricao: "Restaurante típico com show latino-americano.",
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

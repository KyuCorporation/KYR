import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import RoteiroList from "@/components/RoteiroList";
import type { RoteiroResponse } from "@/types/roteiro";

describe("RoteiroList", () => {
  it("mostra valores de trilha e tipo desconhecidos sem quebrar", () => {
    const data = {
      origem: { nome: "Aeroporto", latitude: -25.59, longitude: -54.48 },
      destino: { nome: "Grand Carimã", latitude: -25.62, longitude: -54.47 },
      metadados: { totalPontos: 1, tempoRespostaMs: null, fonteIA: "fallback-sem-otimizacao" },
      pontos: [{
        id: "poi-1",
        nome: "Ponto desconhecido",
        trilha: "ecoturismo",
        tipo: "observacao",
        endereco: "Foz do Iguaçu",
        latitude: null,
        longitude: null,
        fonte: "backend",
        descricao: "",
        distanciaMetros: null,
        duracaoSegundos: null,
      }],
    } as unknown as RoteiroResponse;

    render(<RoteiroList data={data} />);

    expect(screen.getByText("Ponto desconhecido")).toBeTruthy();
    expect(screen.getByText("ecoturismo")).toBeTruthy();
    expect(screen.getByText("observacao")).toBeTruthy();
  });

  it("esconde as etiquetas de trilha e tipo de um ponto sem curadoria", () => {
    const ponto = {
      id: "poi-1",
      nome: "Ponto curado",
      trilha: "turismo",
      tipo: "lazer",
      endereco: "Foz do Iguaçu",
      latitude: -25.6,
      longitude: -54.5,
      fonte: "https://maps.google.com/?cid=1",
      descricao: "Descrição da IA.",
      curado: true,
      distanciaMetros: 100,
      duracaoSegundos: 60,
    };
    const data = {
      origem: { nome: "Aeroporto", latitude: -25.59, longitude: -54.48 },
      destino: { nome: "Centro", latitude: -25.54, longitude: -54.58 },
      metadados: { totalPontos: 2, tempoRespostaMs: 100, fonteIA: "gemini", curadoPorIa: true, fonteRota: "google-directions-api" },
      pontos: [
        ponto,
        { ...ponto, id: "poi-2", nome: "Ponto sem curadoria", trilha: "desconhecida", tipo: "desconhecido", descricao: "", curado: false },
      ],
    } as unknown as RoteiroResponse;

    render(<RoteiroList data={data} />);

    expect(screen.getByText("Ponto sem curadoria")).toBeTruthy();
    expect(screen.getAllByText("Turismo")).toHaveLength(1);
    expect(screen.queryByText("desconhecida")).toBeNull();
    expect(screen.queryByText("desconhecido")).toBeNull();
  });
});
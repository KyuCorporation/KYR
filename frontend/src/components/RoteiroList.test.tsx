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
});
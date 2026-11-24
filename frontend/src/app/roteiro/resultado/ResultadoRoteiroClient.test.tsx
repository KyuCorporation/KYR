import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ResultadoRoteiroClient from "@/app/roteiro/resultado/ResultadoRoteiroClient";
import type { RoteiroResponse } from "@/types/roteiro";

// O mapa usa o SDK do Google Maps, que não existe nos testes.
vi.mock("@/components/RoteiroMap", () => ({ default: () => <div data-testid="mapa" /> }));

const PONTO = {
  id: "poi-1",
  nome: "Paris 6 Bistrô",
  trilha: "turismo",
  tipo: "alimentacao",
  endereco: "Av. das Cataratas, 3570",
  latitude: -25.57,
  longitude: -54.54,
  fonte: "https://maps.google.com/?cid=1",
  descricao: "Bistrô.",
  curado: true,
  distanciaMetros: 1500,
  duracaoSegundos: 300,
  placeId: "place-1",
  parada: false,
};

function roteiro(metadados: Partial<RoteiroResponse["metadados"]> = {}, pontos = [PONTO]): RoteiroResponse {
  return {
    origem: { nome: "Aeroporto de Foz", latitude: -25.59, longitude: -54.49 },
    destino: { nome: "Centro", latitude: -25.54, longitude: -54.58 },
    metadados: { totalPontos: pontos.length, tempoRespostaMs: 900, fonteIA: "gemini", curadoPorIa: true, fonteRota: "google-directions-api", ...metadados },
    pontos,
  } as RoteiroResponse;
}

function abrir(dados: RoteiroResponse) {
  window.sessionStorage.setItem("kyr:last-roteiro", JSON.stringify(dados));
  render(<ResultadoRoteiroClient />);
}

describe("tela Resultado do roteiro", () => {
  it("sem roteiro na sessão, oferece criar um", async () => {
    render(<ResultadoRoteiroClient />);

    expect(await screen.findByText("Este roteiro não está disponível nesta sessão.")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Criar roteiro/ }).getAttribute("href")).toBe("/criar-roteiro");
  });

  it("mostra o trajeto, os totais e os pontos, sem avisos quando tudo funcionou", async () => {
    abrir(roteiro());

    expect(await screen.findByRole("heading", { level: 1 })).toHaveProperty("textContent", "Aeroporto de Foz → Centro");
    expect(screen.getByText("1,5 km")).toBeTruthy();
    expect(screen.getByText("5 min")).toBeTruthy();
    expect(screen.getByText("Paris 6 Bistrô")).toBeTruthy();
    expect(screen.getByTestId("mapa")).toBeTruthy();
    expect(screen.queryByText(/Não foi possível otimizar/)).toBeNull();
    expect(screen.queryByText(/curadoria por IA não está disponível/)).toBeNull();
  });

  it("avisa quando a ordem não foi otimizada e quando a IA não classificou os pontos", async () => {
    abrir(roteiro({ fonteRota: "fallback-sem-otimizacao", curadoPorIa: false }, [{ ...PONTO, distanciaMetros: null, duracaoSegundos: null } as never]));

    expect(await screen.findByText(/Não foi possível otimizar a ordem dos pontos/)).toBeTruthy();
    expect(screen.getByText(/curadoria por IA não está disponível/)).toBeTruthy();
    expect(screen.getAllByText("Indisponível")).toHaveLength(2);
  });

  it("usa o total da rota informado pela API, que inclui o trecho até o destino", async () => {
    abrir(roteiro({ distanciaTotalMetros: 2400, duracaoTotalSegundos: 480 }));

    expect(await screen.findByText("2,4 km")).toBeTruthy();
    expect(screen.getByText("8 min")).toBeTruthy();
    expect(screen.getByText("Distância total")).toBeTruthy();
  });

  it("avisa quando só parte dos lugares ficou sem curadoria", async () => {
    abrir(roteiro({ curadoPorIa: true }, [PONTO, { ...PONTO, id: "poi-2", nome: "Sem resposta", curado: false }]));

    expect(await screen.findByText(/Alguns lugares aparecem sem descrição/)).toBeTruthy();
    expect(screen.queryByText(/curadoria por IA não está disponível/)).toBeNull();
  });

  it("não fala de curadoria quando o roteiro só tem paradas da pessoa", async () => {
    abrir(roteiro({ curadoPorIa: false }, [{ ...PONTO, parada: true }]));

    await screen.findByText("Paris 6 Bistrô");
    expect(screen.queryByText(/curadoria por IA não está disponível/)).toBeNull();
  });

  it("salva a rota neste dispositivo quando não há login", async () => {
    abrir(roteiro());

    fireEvent.click(await screen.findByRole("button", { name: "Salvar rota" }));

    const salvo = await screen.findByRole("button", { name: "Salva neste dispositivo" });
    expect((salvo as HTMLButtonElement).disabled).toBe(true);
    expect(window.localStorage.getItem("kyr:roteiros-salvos")).toContain("Aeroporto de Foz");
  });

  it("explica a falha ao salvar na conta e permite tentar de novo", async () => {
    window.localStorage.setItem("kyr:sessao", JSON.stringify({ nome: "Ana", email: "ana@exemplo.com" }));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 500, headers: { "content-type": "application/json" } })));
    abrir(roteiro());

    fireEvent.click(await screen.findByRole("button", { name: "Salvar rota" }));

    expect((await screen.findByRole("alert")).textContent).toBe("Não foi possível salvar a rota agora. Tente novamente.");
    expect((screen.getByRole("button", { name: "Salvar rota" }) as HTMLButtonElement).disabled).toBe(false);
  });
});

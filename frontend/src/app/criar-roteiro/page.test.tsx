import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CriarRoteiroPage from "@/app/criar-roteiro/page";
import { MOCK_PLACES } from "@/app/criar-roteiro/mockPlaces";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
// Sem o Google: os campos usam as sugestões locais de mockPlaces.ts e a tela mostra a ilustração do mapa.
vi.mock("@/hooks/usePlacesAutocomplete", () => ({
  usePlacesAutocomplete: () => ({ suggestions: [], isSearching: false, resolveSuggestion: vi.fn() }),
}));

const ROTEIRO = {
  origem: { nome: "Aeroporto Internacional de Foz do Iguaçu - PR", latitude: -25.5930876, longitude: -54.4909835 },
  destino: { nome: "Grand Carimã Resort & Convention Center - PR", latitude: -25.5768507, longitude: -54.5485245 },
  metadados: { totalPontos: 1, tempoRespostaMs: 900, fonteIA: "gemini", curadoPorIa: true, fonteRota: "google-directions-api" },
  pontos: [{ id: "poi-1", nome: "Paris 6", trilha: "turismo", tipo: "alimentacao", endereco: "Av. das Cataratas", latitude: -25.57, longitude: -54.54, fonte: "google", descricao: "Bistrô.", curado: true, distanciaMetros: 100, duracaoSegundos: 60 }],
};

function respostaJson(status: number, corpo: unknown): Response {
  return new Response(JSON.stringify(corpo), { status, headers: { "content-type": "application/json" } });
}

function escolher(campo: string, texto: string, sugestao: string) {
  const input = screen.getByRole("combobox", { name: campo });
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: texto } });
  fireEvent.click(screen.getByRole("button", { name: sugestao }));
}

function preencherTrajeto() {
  escolher("Origem", "Aeroporto", "Aeroporto Internacional de Foz do Iguaçu - PR");
  escolher("Destino", "Grand", "Grand Carimã Resort & Convention Center - PR");
}

beforeEach(() => {
  push.mockReset();
  vi.stubEnv("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY", "");
});

describe("tela Criar roteiro", () => {
  it("não chama o servidor sem origem e destino escolhidos", () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    render(<CriarRoteiroPage />);

    fireEvent.click(screen.getByRole("button", { name: /Gerar roteiro/ }));

    expect(screen.getByText("Informe a origem")).toBeTruthy();
    expect(screen.getByText("Informe o destino")).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("soma o tempo e a distância dos lugares escolhidos quando não há mapa real", () => {
    render(<CriarRoteiroPage />);
    preencherTrajeto();

    expect(screen.getAllByText("28 min").length).toBeGreaterThan(0);
    expect(screen.getAllByText("14 km").length).toBeGreaterThan(0);
  });

  it("gera o roteiro com parada e transporte, guarda o resultado e abre a próxima tela", async () => {
    const fetch = vi.fn().mockResolvedValue(respostaJson(200, ROTEIRO));
    vi.stubGlobal("fetch", fetch);
    render(<CriarRoteiroPage />);

    preencherTrajeto();
    fireEvent.click(screen.getByRole("button", { name: /Adicionar parada/ }));
    escolher("1ª Parada", "Marco", "Marco das Três Fronteiras - PR");
    fireEvent.click(screen.getByRole("button", { name: /Caminhada/ }));
    fireEvent.click(screen.getByRole("button", { name: /Gerar roteiro/ }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/roteiro/resultado"));
    const corpo = JSON.parse(fetch.mock.calls[0][1].body);
    expect(fetch.mock.calls[0][0]).toBe("/api/roteiros");
    expect(corpo.origem).toEqual(ROTEIRO.origem);
    expect(corpo.paradas).toEqual([{ nome: "Marco das Três Fronteiras - PR", latitude: -25.5901531, longitude: -54.5902488 }]);
    expect(corpo.transporte).toBe("WALKING");
    expect(JSON.parse(window.sessionStorage.getItem("kyr:last-roteiro") ?? "{}").pontos).toHaveLength(1);
  });

  it("bloqueia o envio se uma parada foi digitada mas não escolhida", () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    render(<CriarRoteiroPage />);

    preencherTrajeto();
    fireEvent.click(screen.getByRole("button", { name: /Adicionar parada/ }));
    fireEvent.change(screen.getByRole("combobox", { name: "1ª Parada" }), { target: { value: "Rua sem sugestão" } });
    fireEvent.click(screen.getByRole("button", { name: /Gerar roteiro/ }));

    expect(screen.getByText("Informe um endereço válido para a parada")).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("mostra o erro do servidor e oferece tentar de novo", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(respostaJson(502, { detail: "Não foi possível conectar ao backend." })));
    render(<CriarRoteiroPage />);

    preencherTrajeto();
    fireEvent.click(screen.getByRole("button", { name: /Gerar roteiro/ }));

    expect((await screen.findByRole("alert")).textContent).toBe("Não foi possível conectar ao backend.");
    expect(screen.getByRole("button", { name: /Tentar novamente/ })).toBeTruthy();
    expect(push).not.toHaveBeenCalled();
  });

  it("avisa sobre o transporte público e começa com a parada vinda de um destino", async () => {
    window.sessionStorage.setItem("kyr:pending-destination", JSON.stringify(MOCK_PLACES[3]));
    render(<CriarRoteiroPage />);

    const parada = await screen.findByRole("combobox", { name: "1ª Parada" });
    expect((parada as HTMLInputElement).value).toBe(MOCK_PLACES[3].name);
    expect(window.sessionStorage.getItem("kyr:pending-destination")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Transporte Público/ }));
    expect(screen.getByText(/No transporte público, os lugares sugeridos seguem o trajeto de carro/)).toBeTruthy();
  });

  it("ignora um destino pendente inválido", async () => {
    window.sessionStorage.setItem("kyr:pending-destination", JSON.stringify({ name: "sem coordenadas" }));
    render(<CriarRoteiroPage />);

    await waitFor(() => expect(window.sessionStorage.getItem("kyr:pending-destination")).toBeNull());
    expect(screen.queryByRole("combobox", { name: "1ª Parada" })).toBeNull();
  });
});

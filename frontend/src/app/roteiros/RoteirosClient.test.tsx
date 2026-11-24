import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RoteirosClient from "@/app/roteiros/RoteirosClient";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const CHAVE = "kyr:roteiros-salvos";
const AEROPORTO = { nome: "Aeroporto de Foz", latitude: -25.59, longitude: -54.49 };
const CENTRO = { nome: "Centro", latitude: -25.54, longitude: -54.58 };

function guardarNoDispositivo(...roteiros: object[]) {
  window.localStorage.setItem(CHAVE, JSON.stringify(roteiros));
}

function respostaJson(status: number, corpo: unknown): Response {
  return new Response(JSON.stringify(corpo), { status, headers: { "content-type": "application/json" } });
}

beforeEach(() => push.mockReset());

describe("tela Meus roteiros", () => {
  it("mostra o convite para criar um roteiro quando não há nenhum salvo", async () => {
    render(<RoteirosClient />);

    expect(await screen.findByText("Você ainda não salvou nenhum roteiro")).toBeTruthy();
    expect(screen.getByText(/Roteiros salvos neste dispositivo\. Entre na sua conta/)).toBeTruthy();
  });

  it("lista os roteiros do dispositivo com os destinos adicionados e os remove", async () => {
    guardarNoDispositivo({
      id: "r1",
      origem: AEROPORTO,
      destino: CENTRO,
      totalPontos: 1,
      placeIds: [],
      destinosAdicionados: ["parque-das-aves", "slug-desconhecido"],
      criadoEm: new Date().toISOString(),
    });
    render(<RoteirosClient />);

    expect(await screen.findByText(/1 ponto sugerido/)).toBeTruthy();
    expect(screen.getByText(/neste dispositivo$/)).toBeTruthy();
    expect(screen.getByText("Destinos adicionados: Parque das Aves")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Remover roteiro Aeroporto de Foz para Centro" }));

    expect(await screen.findByText("Você ainda não salvou nenhum roteiro")).toBeTruthy();
    expect(JSON.parse(window.localStorage.getItem(CHAVE) ?? "[]")).toEqual([]);
  });

  it("depois de 30 dias não permite reabrir e orienta a criar de novo", async () => {
    guardarNoDispositivo({
      id: "antigo",
      origem: AEROPORTO,
      destino: CENTRO,
      totalPontos: 3,
      placeIds: [],
      destinosAdicionados: [],
      criadoEm: "2026-01-01T00:00:00Z",
    });
    render(<RoteirosClient />);

    expect(await screen.findByText(/Salvo há mais de 30 dias/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Abrir roteiro/ })).toBeNull();
    // O nome vindo das sugestões do Google também foi apagado.
    expect(screen.getByRole("heading", { level: 2 }).textContent).toContain("Origem apagada");
  });

  it("reabrir gera o roteiro de novo com a mesma origem e o mesmo destino", async () => {
    guardarNoDispositivo({ id: "r1", origem: AEROPORTO, destino: CENTRO, totalPontos: 2, placeIds: [], destinosAdicionados: [], criadoEm: new Date().toISOString() });
    const fetch = vi.fn().mockResolvedValue(respostaJson(200, {
      origem: AEROPORTO,
      destino: CENTRO,
      metadados: { totalPontos: 1 },
      pontos: [{ id: "p1", nome: "Aloa Coffee", trilha: "turismo", tipo: "alimentacao" }],
    }));
    vi.stubGlobal("fetch", fetch);
    render(<RoteirosClient />);

    fireEvent.click(await screen.findByRole("button", { name: /Abrir roteiro/ }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/roteiro/resultado"));
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ origem: AEROPORTO, destino: CENTRO });
    expect(window.sessionStorage.getItem("kyr:last-roteiro")).toContain("Aloa Coffee");
  });

  it("mostra o erro quando a reabertura falha e libera o botão", async () => {
    guardarNoDispositivo({ id: "r1", origem: AEROPORTO, destino: CENTRO, totalPontos: 2, placeIds: [], destinosAdicionados: [], criadoEm: new Date().toISOString() });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(respostaJson(504, { detail: "O servidor demorou para responder." })));
    render(<RoteirosClient />);

    fireEvent.click(await screen.findByRole("button", { name: /Abrir roteiro/ }));

    expect((await screen.findByRole("alert")).textContent).toBe("O servidor demorou para responder.");
    expect((screen.getByRole("button", { name: /Abrir roteiro/ }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("com login, junta os roteiros da conta e os do dispositivo", async () => {
    window.localStorage.setItem("kyr:sessao", JSON.stringify({ nome: "Ana", email: "ana@exemplo.com" }));
    guardarNoDispositivo({ id: "local", origem: AEROPORTO, destino: CENTRO, totalPontos: 2, placeIds: [], destinosAdicionados: [], criadoEm: new Date().toISOString() });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(respostaJson(200, [
      { id: 7, origem: CENTRO, destino: AEROPORTO, totalPontos: 5, placeIds: [], criadoEm: new Date().toISOString(), podeReabrir: true },
    ])));
    render(<RoteirosClient />);

    expect(await screen.findByText(/na sua conta$/)).toBeTruthy();
    expect(screen.getByText(/neste dispositivo$/)).toBeTruthy();
    expect(screen.getByText("Roteiros salvos na sua conta e neste dispositivo.")).toBeTruthy();
  });

  it("explica quando não consegue carregar os roteiros da conta", async () => {
    window.localStorage.setItem("kyr:sessao", JSON.stringify({ nome: "Ana", email: "ana@exemplo.com" }));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(respostaJson(500, { mensagem: "Erro no servidor." })));
    render(<RoteirosClient />);

    expect((await screen.findByRole("alert")).textContent).toBe("Erro no servidor.");
  });
});

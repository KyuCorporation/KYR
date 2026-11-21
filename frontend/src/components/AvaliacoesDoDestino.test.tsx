import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AvaliacoesDoDestino from "@/components/AvaliacoesDoDestino";

const SESSAO = JSON.stringify({ nome: "Ana Viajante", email: "ana@exemplo.com" });

function respostaJson(status: number, corpo: unknown): Response {
  return new Response(JSON.stringify(corpo), { status, headers: { "content-type": "application/json" } });
}

const UMA_AVALIACAO = {
  media: 4,
  total: 1,
  avaliacoes: [{ autor: "Bruno", nota: 4, comentario: "Vale a visita.", criadoEm: "2026-11-10T12:00:00Z" }],
};

describe("AvaliacoesDoDestino", () => {
  it("mostra a média e as avaliações e convida quem não entrou a fazer login", async () => {
    const fetch = vi.fn().mockResolvedValue(respostaJson(200, UMA_AVALIACAO));
    vi.stubGlobal("fetch", fetch);
    render(<AvaliacoesDoDestino slug="parque-das-aves" />);

    expect(await screen.findByText("4 de 5 · 1 avaliação de viajantes do Kyr")).toBeTruthy();
    expect(screen.getByText("Vale a visita.")).toBeTruthy();
    expect(screen.getByLabelText("4 de 5 estrelas")).toBeTruthy();
    expect(screen.getByText("10/11/2026")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Entre na sua conta" }).getAttribute("href")).toBe("/entrar");
    expect(screen.queryByRole("radiogroup")).toBeNull();
    expect(fetch.mock.calls[0][0]).toBe("/api/destinos/parque-das-aves/avaliacoes");
  });

  it("avisa quando ainda não há avaliações e quando a carga falha", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(respostaJson(200, { media: null, total: 0, avaliacoes: [] }))
      .mockRejectedValueOnce(new TypeError("offline")));

    const { unmount } = render(<AvaliacoesDoDestino slug="parque-das-aves" />);
    expect(await screen.findByText("Este destino ainda não tem avaliações de viajantes do Kyr.")).toBeTruthy();
    unmount();

    render(<AvaliacoesDoDestino slug="itaipu-binacional" />);
    expect((await screen.findByRole("alert")).textContent).toBe("Não foi possível carregar as avaliações agora.");
  });

  it("pede uma nota antes de enviar e envia nota e comentário", async () => {
    window.localStorage.setItem("kyr:sessao", SESSAO);
    const fetch = vi.fn()
      .mockResolvedValueOnce(respostaJson(200, { media: null, total: 0, avaliacoes: [] }))
      .mockResolvedValueOnce(respostaJson(200, {
        media: 5,
        total: 1,
        avaliacoes: [{ autor: "Ana", nota: 5, comentario: "Incrível", criadoEm: "2026-11-20T10:00:00Z" }],
      }));
    vi.stubGlobal("fetch", fetch);
    render(<AvaliacoesDoDestino slug="parque-das-aves" />);

    const enviar = await screen.findByRole("button", { name: "Enviar avaliação" });
    fireEvent.click(enviar);
    expect(await screen.findByText("Escolha uma nota de 1 a 5 estrelas.")).toBeTruthy();
    expect(fetch).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("radio", { name: "5 estrelas" }));
    expect(screen.getByRole("radio", { name: "5 estrelas" }).getAttribute("aria-checked")).toBe("true");
    fireEvent.change(screen.getByLabelText("Comentário (opcional)"), { target: { value: "Incrível" } });
    fireEvent.click(enviar);

    expect(await screen.findByText("Avaliação enviada. Obrigado!")).toBeTruthy();
    expect(fetch.mock.calls[1][1].method).toBe("PUT");
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({ nota: 5, comentario: "Incrível" });
    expect(screen.getByText("5 de 5 · 1 avaliação de viajantes do Kyr")).toBeTruthy();
    expect((screen.getByLabelText("Comentário (opcional)") as HTMLTextAreaElement).value).toBe("");
  });

  it("com a sessão vencida, esquece o login e esconde o formulário", async () => {
    window.localStorage.setItem("kyr:sessao", SESSAO);
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(respostaJson(200, { media: null, total: 0, avaliacoes: [] }))
      .mockResolvedValueOnce(respostaJson(401, { mensagem: "Entre na sua conta para continuar." })));
    render(<AvaliacoesDoDestino slug="parque-das-aves" />);

    fireEvent.click(await screen.findByRole("radio", { name: "3 estrelas" }));
    fireEvent.click(screen.getByRole("button", { name: "Enviar avaliação" }));

    expect(await screen.findByText("Sua sessão terminou. Entre de novo para avaliar.")).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole("radiogroup")).toBeNull());
    expect(window.localStorage.getItem("kyr:sessao")).toBeNull();
  });
});

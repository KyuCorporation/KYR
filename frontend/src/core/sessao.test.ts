import { describe, expect, it, vi } from "vitest";
import { cadastrar, entrar, esquecerSessao, lerSessao, sair } from "@/core/sessao";

const ANA = { nome: "Ana Viajante", email: "ana@exemplo.com" };

function respostaJson(status: number, corpo: unknown): Response {
  return new Response(JSON.stringify(corpo), { status, headers: { "content-type": "application/json" } });
}

describe("sessão no navegador", () => {
  it("entra, guarda só nome e e-mail e devolve o usuário", async () => {
    const fetch = vi.fn().mockResolvedValue(respostaJson(200, { usuario: ANA }));
    vi.stubGlobal("fetch", fetch);

    await expect(entrar("ana@exemplo.com", "segredo-123")).resolves.toEqual(ANA);

    expect(fetch.mock.calls[0][0]).toBe("/api/auth/login");
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ email: "ana@exemplo.com", senha: "segredo-123" });
    expect(lerSessao()).toEqual(ANA);
    expect(window.localStorage.getItem("kyr:sessao")).not.toContain("segredo");
  });

  it("cadastra pela rota de cadastro", async () => {
    const fetch = vi.fn().mockResolvedValue(respostaJson(201, { usuario: ANA }));
    vi.stubGlobal("fetch", fetch);

    await cadastrar("Ana Viajante", "ana@exemplo.com", "segredo-123");

    expect(fetch.mock.calls[0][0]).toBe("/api/auth/cadastro");
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({ nome: "Ana Viajante" });
  });

  it("recusa uma resposta sem usuário válido e não guarda nada", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(respostaJson(200, { usuario: { nome: "Ana" } })));

    await expect(entrar("ana@exemplo.com", "x")).rejects.toThrow("resposta inesperada");
    expect(lerSessao()).toBeNull();
  });

  it("propaga o erro do servidor, como senha errada", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(respostaJson(401, { mensagem: "E-mail ou senha incorretos." })));

    await expect(entrar("ana@exemplo.com", "errada")).rejects.toMatchObject({ status: 401, message: "E-mail ou senha incorretos." });
    expect(lerSessao()).toBeNull();
  });

  it("sair esquece a sessão mesmo se o servidor falhar", async () => {
    window.localStorage.setItem("kyr:sessao", JSON.stringify(ANA));
    const fetch = vi.fn().mockRejectedValue(new TypeError("offline"));
    vi.stubGlobal("fetch", fetch);

    sair();

    expect(lerSessao()).toBeNull();
    expect(fetch).toHaveBeenCalledWith("/api/auth/sair", expect.objectContaining({ method: "POST" }));
  });

  it("esquecerSessao limpa e lerSessao ignora conteúdo inválido", () => {
    window.localStorage.setItem("kyr:sessao", JSON.stringify(ANA));
    esquecerSessao();
    expect(lerSessao()).toBeNull();

    window.localStorage.setItem("kyr:sessao", "{quebrado");
    expect(lerSessao()).toBeNull();
  });
});

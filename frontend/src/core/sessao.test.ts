import { describe, expect, it, vi } from "vitest";
import {
  apagarDadosDoDispositivo,
  atualizarNome,
  buscarMeusDados,
  cadastrar,
  entrar,
  esquecerSessao,
  excluirConta,
  lerSessao,
  sair,
} from "@/core/sessao";

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

describe("direitos do titular (LGPD)", () => {
  function simularCacheStorage() {
    const remover = vi.fn().mockResolvedValue(true);
    vi.stubGlobal("caches", { delete: remover });
    return remover;
  }

  it("sair e esquecer a sessão apagam o cache antigo de respostas da API", () => {
    const remover = simularCacheStorage();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));

    sair();
    esquecerSessao();

    expect(remover).toHaveBeenCalledTimes(2);
    expect(remover).toHaveBeenCalledWith("apis");
  });

  it("corrige o nome no servidor e na sessão do navegador", async () => {
    window.localStorage.setItem("kyr:sessao", JSON.stringify(ANA));
    const fetch = vi.fn().mockResolvedValue(respostaJson(200, { nome: "Ana Souza", email: ANA.email }));
    vi.stubGlobal("fetch", fetch);

    await expect(atualizarNome("Ana Souza")).resolves.toEqual({ nome: "Ana Souza", email: ANA.email });

    expect(fetch.mock.calls[0][0]).toBe("/api/auth/eu");
    expect(fetch.mock.calls[0][1].method).toBe("PUT");
    expect(lerSessao()?.nome).toBe("Ana Souza");
  });

  it("busca os dados da conta sem cache", async () => {
    const fetch = vi.fn().mockResolvedValue(respostaJson(200, { conta: { email: ANA.email } }));
    vi.stubGlobal("fetch", fetch);

    await expect(buscarMeusDados()).resolves.toEqual({ conta: { email: ANA.email } });
    expect(fetch.mock.calls[0][0]).toBe("/api/auth/meus-dados");
    expect(fetch.mock.calls[0][1].cache).toBe("no-store");
  });

  it("excluir a conta envia a senha e só esquece a sessão se o servidor confirmar", async () => {
    window.localStorage.setItem("kyr:sessao", JSON.stringify(ANA));
    simularCacheStorage();
    const fetch = vi.fn()
      .mockResolvedValueOnce(respostaJson(403, { codigo: "senha_incorreta", mensagem: "Senha incorreta." }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetch);

    await expect(excluirConta("errada")).rejects.toMatchObject({ status: 403, message: "Senha incorreta." });
    expect(lerSessao()).toEqual(ANA);

    await excluirConta("certa-123");
    expect(fetch.mock.calls[1][0]).toBe("/api/auth/conta");
    expect(fetch.mock.calls[1][1].method).toBe("DELETE");
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({ senha: "certa-123" });
    expect(lerSessao()).toBeNull();
  });

  it("apaga os dados do Kyr no navegador, mantém a sessão e não mexe em chaves que não são do Kyr", () => {
    const remover = simularCacheStorage();
    const aviso = vi.fn();
    window.addEventListener("kyr:favoritos", aviso);
    window.localStorage.setItem("kyr:sessao", JSON.stringify(ANA));
    window.localStorage.setItem("kyr:favoritos", '["parque-das-aves"]');
    window.localStorage.setItem("kyr:roteiros-salvos", "[]");
    window.localStorage.setItem("kyr:sidebar-expandida", "1");
    window.localStorage.setItem("outro-site", "fica");
    window.sessionStorage.setItem("kyr:last-roteiro", "{}");

    apagarDadosDoDispositivo();

    expect(window.localStorage.getItem("kyr:favoritos")).toBeNull();
    expect(window.localStorage.getItem("kyr:roteiros-salvos")).toBeNull();
    expect(window.localStorage.getItem("kyr:sidebar-expandida")).toBeNull();
    expect(window.sessionStorage.getItem("kyr:last-roteiro")).toBeNull();
    expect(lerSessao()).toEqual(ANA);
    expect(window.localStorage.getItem("outro-site")).toBe("fica");
    expect(remover).toHaveBeenCalledWith("apis");
    expect(aviso).toHaveBeenCalled();
    window.removeEventListener("kyr:favoritos", aviso);
  });
});

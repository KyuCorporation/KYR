// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

// Cookies do Next simulados: as rotas só leem, gravam e apagam o cookie da sessão.
const cookies = new Map<string, { value: string; options?: Record<string, unknown> }>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (nome: string) => (cookies.has(nome) ? { name: nome, value: cookies.get(nome)!.value } : undefined),
    set: (nome: string, value: string, options?: Record<string, unknown>) => cookies.set(nome, { value, options }),
    delete: (nome: string) => cookies.delete(nome),
  }),
}));

import { POST as cadastro } from "@/app/api/auth/cadastro/route";
import { DELETE as excluirConta } from "@/app/api/auth/conta/route";
import { GET as eu, PUT as corrigirNome } from "@/app/api/auth/eu/route";
import { GET as meusDados } from "@/app/api/auth/meus-dados/route";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as sairDaConta } from "@/app/api/auth/sair/route";
import { GET as listarAvaliacoes, PUT as avaliar } from "@/app/api/destinos/[slug]/avaliacoes/route";
import { DELETE as removerSalvo } from "@/app/api/roteiros-salvos/[id]/route";
import { GET as listarSalvos, POST as salvar } from "@/app/api/roteiros-salvos/route";
import { POST as roteiros } from "@/app/api/roteiros/route";
import { chamarBackend, COOKIE_DA_SESSAO } from "@/core/servidor";

const BACKEND = "http://backend.teste";
const USUARIO = { nome: "Ana Viajante", email: "ana@exemplo.com" };

function json(status: number, corpo: unknown): Response {
  return new Response(JSON.stringify(corpo), { status, headers: { "content-type": "application/json" } });
}

function requisicao(corpo?: unknown, bruto?: string, cabecalhos: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/x", {
    method: "POST",
    headers: { "content-type": "application/json", ...cabecalhos },
    body: bruto ?? (corpo === undefined ? undefined : JSON.stringify(corpo)),
  });
}

const parametros = <T>(valor: T) => ({ params: Promise.resolve(valor) });

let fetch: ReturnType<typeof vi.fn>;

beforeEach(() => {
  cookies.clear();
  vi.unstubAllEnvs();
  vi.stubEnv("INTERNAL_API_URL", `${BACKEND}/`);
  fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
});

function chamada(indice = 0): { url: string; init: RequestInit & { headers: Record<string, string> } } {
  const [url, init] = fetch.mock.calls[indice];
  return { url, init };
}

describe("chamarBackend", () => {
  it("responde 401 sem chamar o backend quando falta o cookie numa rota autenticada", async () => {
    const resposta = await chamarBackend("/roteiros-salvos", { autenticado: true });

    expect(resposta).toEqual({ status: 401, corpo: expect.objectContaining({ codigo: "nao_autenticado" }) });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("envia o token do cookie em Authorization e não guarda cache", async () => {
    cookies.set(COOKIE_DA_SESSAO, { value: "token-123" });
    fetch.mockResolvedValue(json(200, []));

    await chamarBackend("/roteiros-salvos", { autenticado: true });

    expect(chamada().url).toBe(`${BACKEND}/roteiros-salvos`);
    expect(chamada().init.headers.Authorization).toBe("Bearer token-123");
    expect(chamada().init.cache).toBe("no-store");
  });

  it("devolve 502 quando o backend não responde e trata corpo não JSON", async () => {
    fetch.mockRejectedValueOnce(new TypeError("ECONNREFUSED")).mockResolvedValueOnce(new Response("<html>", { status: 500 }));

    await expect(chamarBackend("/x")).resolves.toMatchObject({ status: 502, corpo: { codigo: "backend_indisponivel" } });
    await expect(chamarBackend("/x")).resolves.toMatchObject({ status: 500, corpo: { mensagem: expect.stringContaining("inesperada") } });
  });
});

describe("/api/auth", () => {
  it("login guarda o token em cookie httpOnly e devolve só o usuário", async () => {
    fetch.mockResolvedValue(json(200, { token: "token-abc", usuario: USUARIO }));

    const resposta = await login(requisicao({ email: USUARIO.email, senha: "segredo-123" }));
    const corpo = await resposta.json();

    expect(resposta.status).toBe(200);
    expect(corpo).toEqual({ usuario: USUARIO });
    expect(JSON.stringify(corpo)).not.toContain("token-abc");
    expect(cookies.get(COOKIE_DA_SESSAO)).toMatchObject({
      value: "token-abc",
      options: { httpOnly: true, sameSite: "lax", path: "/" },
    });
    expect(chamada().url).toBe(`${BACKEND}/auth/login`);
    expect(JSON.parse(chamada().init.body as string)).toEqual({ email: USUARIO.email, senha: "segredo-123" });
  });

  it("login com senha errada repassa o erro e não cria cookie", async () => {
    fetch.mockResolvedValue(json(401, { codigo: "credenciais_invalidas", mensagem: "E-mail ou senha incorretos." }));

    const resposta = await login(requisicao({ email: USUARIO.email, senha: "errada" }));

    expect(resposta.status).toBe(401);
    expect(cookies.has(COOKIE_DA_SESSAO)).toBe(false);
  });

  it("cadastro abre a sessão e recusa corpo que não é JSON", async () => {
    fetch.mockResolvedValue(json(201, { token: "token-novo", usuario: USUARIO }));

    const invalido = await cadastro(requisicao(undefined, "nome=Ana"));
    expect(invalido.status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();

    const resposta = await cadastro(requisicao({ ...USUARIO, senha: "segredo-123" }));
    expect(resposta.status).toBe(201);
    expect(cookies.get(COOKIE_DA_SESSAO)?.value).toBe("token-novo");
  });

  it("login e cadastro informam ao backend o IP anotado pelo proxy, com o segredo compartilhado", async () => {
    vi.stubEnv("KYR_PROXY_TOKEN", "segredo-do-next");
    vi.stubEnv("KYR_PROXIES_CONFIAVEIS", "1");
    fetch.mockResolvedValue(json(401, { codigo: "credenciais_invalidas" }));
    // "10.0.0.1" foi escrito pelo navegador; "203.0.113.7" foi anotado pelo proxy da hospedagem.
    const ip = { "x-forwarded-for": "10.0.0.1, 203.0.113.7" };

    await login(requisicao({ email: USUARIO.email, senha: "x" }, undefined, ip));
    await cadastro(requisicao({ ...USUARIO, senha: "segredo-123" }, undefined, ip));
    await login(requisicao({ email: USUARIO.email, senha: "x" }));

    for (const indice of [0, 1]) {
      expect(chamada(indice).init.headers["X-Kyr-Client-Ip"]).toBe("203.0.113.7");
      expect(chamada(indice).init.headers["X-Kyr-Proxy-Token"]).toBe("segredo-do-next");
      expect(chamada(indice).init.headers["X-Forwarded-For"]).toBeUndefined();
    }
    expect(chamada(2).init.headers["X-Kyr-Client-Ip"]).toBeUndefined();
  });

  it("sem segredo configurado não repassa nenhum IP, nem o X-Forwarded-For que o navegador mandou", async () => {
    vi.stubEnv("KYR_PROXY_TOKEN", "");
    vi.stubEnv("KYR_PROXIES_CONFIAVEIS", "1");
    fetch.mockResolvedValue(json(401, { codigo: "credenciais_invalidas" }));

    await login(requisicao({ email: USUARIO.email, senha: "x" }, undefined, { "x-forwarded-for": "10.0.0.1" }));

    expect(chamada().init.headers["X-Kyr-Client-Ip"]).toBeUndefined();
    expect(chamada().init.headers["X-Forwarded-For"]).toBeUndefined();
  });

  it("responde 400 com o corpo legível a cada pedido inválido, não só ao primeiro", async () => {
    for (let i = 0; i < 3; i++) {
      const resposta = await login(requisicao(undefined, "email=ana"));
      expect(resposta.status).toBe(400);
      expect(await resposta.json()).toEqual({ codigo: "dados_invalidos", mensagem: "O corpo da requisição deve ser JSON válido." });
    }
    expect(fetch).not.toHaveBeenCalled();
  });

  it("login bloqueado repassa o 429 com a mensagem de espera e não cria cookie", async () => {
    fetch.mockResolvedValue(json(429, { codigo: "muitas_tentativas", mensagem: "Muitas tentativas. Tente de novo em 15 minutos." }));

    const resposta = await login(requisicao({ email: USUARIO.email, senha: "x" }));

    expect(resposta.status).toBe(429);
    expect(await resposta.json()).toEqual({ codigo: "muitas_tentativas", mensagem: "Muitas tentativas. Tente de novo em 15 minutos." });
    expect(cookies.has(COOKIE_DA_SESSAO)).toBe(false);
  });

  it("eu apaga o cookie quando o backend diz que a sessão venceu", async () => {
    cookies.set(COOKIE_DA_SESSAO, { value: "vencido" });
    fetch.mockResolvedValue(json(401, { codigo: "nao_autenticado" }));

    const resposta = await eu();

    expect(resposta.status).toBe(401);
    expect(cookies.has(COOKIE_DA_SESSAO)).toBe(false);
  });

  it("eu mantém o cookie de uma sessão válida", async () => {
    cookies.set(COOKIE_DA_SESSAO, { value: "valido" });
    fetch.mockResolvedValue(json(200, USUARIO));

    const resposta = await eu();

    expect(await resposta.json()).toEqual(USUARIO);
    expect(cookies.has(COOKIE_DA_SESSAO)).toBe(true);
  });

  it("sair encerra no backend, apaga o cookie e responde 204", async () => {
    cookies.set(COOKIE_DA_SESSAO, { value: "token" });
    fetch.mockResolvedValue(new Response(null, { status: 204 }));

    const resposta = await sairDaConta();

    expect(resposta.status).toBe(204);
    expect(chamada().url).toBe(`${BACKEND}/auth/sair`);
    expect(cookies.has(COOKIE_DA_SESSAO)).toBe(false);
  });
});

describe("direitos do titular (LGPD)", () => {
  function requisicaoDelete(corpo: unknown): Request {
    return new Request("http://localhost/api/auth/conta", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(corpo),
    });
  }

  it("corrige o nome com a sessão do cookie", async () => {
    cookies.set(COOKIE_DA_SESSAO, { value: "token" });
    fetch.mockResolvedValue(json(200, { nome: "Ana Souza", email: USUARIO.email }));

    const resposta = await corrigirNome(new Request("http://localhost", { method: "PUT", body: JSON.stringify({ nome: "Ana Souza" }) }));

    expect(await resposta.json()).toEqual({ nome: "Ana Souza", email: USUARIO.email });
    expect(chamada().url).toBe(`${BACKEND}/auth/eu`);
    expect(chamada().init.method).toBe("PUT");
    expect(chamada().init.headers.Authorization).toBe("Bearer token");
  });

  it("meus dados exige login e responde sem cache", async () => {
    expect((await meusDados()).status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();

    cookies.set(COOKIE_DA_SESSAO, { value: "token" });
    fetch.mockResolvedValue(json(200, { conta: { email: USUARIO.email } }));
    const resposta = await meusDados();

    expect(resposta.status).toBe(200);
    expect(resposta.headers.get("cache-control")).toBe("no-store");
    expect(chamada().url).toBe(`${BACKEND}/auth/meus-dados`);
  });

  it("excluir a conta apaga o cookie só quando o backend confirma", async () => {
    cookies.set(COOKIE_DA_SESSAO, { value: "token" });
    fetch
      .mockResolvedValueOnce(json(403, { codigo: "senha_incorreta", mensagem: "Senha incorreta." }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));

    const negada = await excluirConta(requisicaoDelete({ senha: "errada" }));
    expect(negada.status).toBe(403);
    expect(cookies.has(COOKIE_DA_SESSAO)).toBe(true);

    const aceita = await excluirConta(requisicaoDelete({ senha: "certa-123" }));
    expect(aceita.status).toBe(204);
    expect(cookies.has(COOKIE_DA_SESSAO)).toBe(false);
    expect(chamada(1).url).toBe(`${BACKEND}/auth/conta`);
    expect(chamada(1).init.method).toBe("DELETE");
    expect(JSON.parse(chamada(1).init.body as string)).toEqual({ senha: "certa-123" });
  });

  it("excluir a conta recusa corpo inválido e falta de login sem chamar o backend", async () => {
    const invalido = await excluirConta(new Request("http://localhost", { method: "DELETE", body: "senha=x" }));
    expect(invalido.status).toBe(400);
    expect((await excluirConta(requisicaoDelete({ senha: "x" }))).status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("/api/roteiros-salvos", () => {
  it("lista e salva com o token da sessão", async () => {
    cookies.set(COOKIE_DA_SESSAO, { value: "token" });
    fetch.mockResolvedValueOnce(json(200, [{ id: 1 }])).mockResolvedValueOnce(json(201, { id: 2 }));

    expect(await (await listarSalvos()).json()).toEqual([{ id: 1 }]);
    const salvo = await salvar(requisicao({ origem: {}, destino: {}, placeIds: [] }));

    expect(salvo.status).toBe(201);
    expect(chamada(1).init.method).toBe("POST");
    expect(chamada(1).init.headers.Authorization).toBe("Bearer token");
  });

  it("sem login responde 401 e não chama o backend", async () => {
    expect((await listarSalvos()).status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("remove só IDs numéricos, sem deixar montar outro caminho no backend", async () => {
    cookies.set(COOKIE_DA_SESSAO, { value: "token" });
    fetch.mockResolvedValue(new Response(null, { status: 204 }));

    const invalido = await removerSalvo(new Request("http://localhost"), parametros({ id: "1/../../auth" }));
    expect(invalido.status).toBe(404);
    expect(fetch).not.toHaveBeenCalled();

    const ok = await removerSalvo(new Request("http://localhost"), parametros({ id: "42" }));
    expect(ok.status).toBe(204);
    expect(chamada().url).toBe(`${BACKEND}/roteiros-salvos/42`);
    expect(chamada().init.method).toBe("DELETE");
  });
});

describe("/api/destinos/[slug]/avaliacoes", () => {
  it("lista avaliações sem exigir login", async () => {
    fetch.mockResolvedValue(json(200, { media: 4.5, total: 2, avaliacoes: [] }));

    const resposta = await listarAvaliacoes(new Request("http://localhost"), parametros({ slug: "parque-das-aves" }));

    expect(resposta.status).toBe(200);
    expect(chamada().url).toBe(`${BACKEND}/destinos/parque-das-aves/avaliacoes`);
    expect(chamada().init.headers.Authorization).toBeUndefined();
  });

  it("recusa slugs fora do padrão antes de chamar o backend", async () => {
    for (const slug of ["../auth/eu", "Parque", "a".repeat(121)]) {
      const resposta = await listarAvaliacoes(new Request("http://localhost"), parametros({ slug }));
      expect(resposta.status).toBe(404);
    }
    expect(fetch).not.toHaveBeenCalled();
  });

  it("avaliar exige login e envia nota e comentário", async () => {
    const semLogin = await avaliar(requisicao({ nota: 5 }), parametros({ slug: "parque-das-aves" }));
    expect(semLogin.status).toBe(401);

    cookies.set(COOKIE_DA_SESSAO, { value: "token" });
    fetch.mockResolvedValue(json(200, { media: 5, total: 1, avaliacoes: [] }));
    const resposta = await avaliar(requisicao({ nota: 5, comentario: "Lindo" }), parametros({ slug: "parque-das-aves" }));

    expect(resposta.status).toBe(200);
    expect(chamada().init.method).toBe("PUT");
    expect(JSON.parse(chamada().init.body as string)).toEqual({ nota: 5, comentario: "Lindo" });
  });
});

describe("/api/roteiros", () => {
  const corpo = { origem: { nome: "A", latitude: -25.6, longitude: -54.5 }, destino: { nome: "B", latitude: -25.5, longitude: -54.6 } };

  it("repassa o pedido ao backend e devolve o roteiro", async () => {
    fetch.mockResolvedValue(json(200, { pontos: [] }));

    const resposta = await roteiros(requisicao(corpo));

    expect(await resposta.json()).toEqual({ pontos: [] });
    expect(chamada().url).toBe(`${BACKEND}/roteiros`);
    expect(JSON.parse(chamada().init.body as string)).toEqual(corpo);
  });

  it("informa o IP do navegador para o limite de roteiros e repassa o 429 com a mensagem", async () => {
    vi.stubEnv("KYR_PROXY_TOKEN", "segredo-do-next");
    vi.stubEnv("KYR_PROXIES_CONFIAVEIS", "1");
    fetch.mockResolvedValue(json(429, { codigo: "muitas_tentativas", mensagem: "Muitos roteiros pedidos em pouco tempo. Tente de novo em 30 minutos." }));

    const resposta = await roteiros(requisicao(corpo, undefined, { "x-forwarded-for": "203.0.113.7" }));

    expect(chamada().init.headers["X-Kyr-Client-Ip"]).toBe("203.0.113.7");
    expect(resposta.status).toBe(429);
    expect((await resposta.json()).detail).toBe("Muitos roteiros pedidos em pouco tempo. Tente de novo em 30 minutos.");
  });

  it("devolve 400 para corpo inválido e repassa erros de validação do backend", async () => {
    expect((await roteiros(requisicao(undefined, "{"))).status).toBe(400);

    fetch.mockResolvedValue(json(400, { errors: [{ field: "origem", defaultMessage: "é obrigatória" }] }));
    const resposta = await roteiros(requisicao({}));

    expect(resposta.status).toBe(400);
    expect(await resposta.json()).toEqual({ detail: "origem: é obrigatória", errors: ["origem: é obrigatória"] });
  });

  it("responde 502 quando o backend está fora do ar", async () => {
    fetch.mockRejectedValue(new TypeError("ECONNREFUSED"));

    const resposta = await roteiros(requisicao(corpo));

    expect(resposta.status).toBe(502);
  });
});

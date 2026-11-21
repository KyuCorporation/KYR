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
import { GET as eu } from "@/app/api/auth/eu/route";
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

function requisicao(corpo?: unknown, bruto?: string): Request {
  return new Request("http://localhost/api/x", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: bruto ?? (corpo === undefined ? undefined : JSON.stringify(corpo)),
  });
}

const parametros = <T>(valor: T) => ({ params: Promise.resolve(valor) });

let fetch: ReturnType<typeof vi.fn>;

beforeEach(() => {
  cookies.clear();
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

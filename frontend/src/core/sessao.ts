import { apiFetch } from "@/core/api";

// Sessão vista pelo navegador. O token fica em um cookie httpOnly (ver core/servidor.ts); aqui só
// guardamos nome e e-mail para a interface saber quem está logado sem perguntar ao servidor a cada tela.

const CHAVE = "kyr:sessao";

export interface Sessao {
  nome: string;
  email: string;
}

function ehSessao(valor: unknown): valor is Sessao {
  if (typeof valor !== "object" || valor === null) return false;
  const registro = valor as Record<string, unknown>;
  return typeof registro.nome === "string" && typeof registro.email === "string";
}

export function lerSessao(): Sessao | null {
  try {
    const guardado = window.localStorage.getItem(CHAVE);
    const valor: unknown = guardado ? JSON.parse(guardado) : null;
    return ehSessao(valor) ? valor : null;
  } catch {
    return null;
  }
}

function guardarSessao(sessao: Sessao | null): void {
  try {
    if (sessao) window.localStorage.setItem(CHAVE, JSON.stringify(sessao));
    else window.localStorage.removeItem(CHAVE);
  } catch {
    // Sem localStorage a pessoa continua logada pelo cookie; só a interface não lembra o nome.
  }
}

async function abrir(caminho: string, corpo: Record<string, string>): Promise<Sessao> {
  const resposta = await apiFetch<{ usuario?: unknown }>(caminho, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
  });
  if (!ehSessao(resposta?.usuario)) {
    throw new Error("O servidor devolveu uma resposta inesperada.");
  }
  guardarSessao(resposta.usuario);
  return resposta.usuario;
}

export function entrar(email: string, senha: string): Promise<Sessao> {
  return abrir("/api/auth/login", { email, senha });
}

export function cadastrar(nome: string, email: string, senha: string): Promise<Sessao> {
  return abrir("/api/auth/cadastro", { nome, email, senha });
}

export function sair(): void {
  guardarSessao(null);
  limparCacheDoAplicativo();
  void apiFetch("/api/auth/sair", { method: "POST" }).catch(() => undefined);
}

/** Chamado quando o servidor responde 401: a sessão do navegador deixa de valer. */
export function esquecerSessao(): void {
  guardarSessao(null);
  limparCacheDoAplicativo();
}

// ---------- Direitos do titular (LGPD, art. 18) ----------

/**
 * Versões antigas do service worker guardavam as respostas de /api/* (nome, e-mail, roteiros da
 * conta) no cache "apis" do aparelho. O next.config.ts deixou de guardá-las; isto apaga o que ficou.
 */
export function limparCacheDoAplicativo(): void {
  try {
    if ("caches" in window) void window.caches.delete("apis").catch(() => undefined);
  } catch {
    // Sem acesso ao Cache Storage não há o que apagar.
  }
}

/** Correção: troca o nome da conta. */
export async function atualizarNome(nome: string): Promise<Sessao> {
  const usuario = await apiFetch<unknown>("/api/auth/eu", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nome }),
  });
  if (!ehSessao(usuario)) throw new Error("O servidor devolveu uma resposta inesperada.");
  guardarSessao(usuario);
  return usuario;
}

/** Acesso e portabilidade: tudo o que o servidor guarda sobre a conta. */
export function buscarMeusDados(): Promise<unknown> {
  return apiFetch<unknown>("/api/auth/meus-dados", { cache: "no-store" });
}

/** Eliminação: apaga a conta no servidor (pede a senha) e esquece a sessão neste navegador. */
export async function excluirConta(senha: string): Promise<void> {
  await apiFetch("/api/auth/conta", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ senha }),
  });
  esquecerSessao();
}

/**
 * Apaga o que o Kyr guardou neste navegador (favoritos, roteiros salvos no dispositivo, último roteiro
 * gerado, preferências e cache). Mantém só a sessão, que é apagada ao sair da conta.
 */
export function apagarDadosDoDispositivo(): void {
  for (const armazenamento of [window.localStorage, window.sessionStorage]) {
    try {
      const chaves = Array.from({ length: armazenamento.length }, (_, i) => armazenamento.key(i))
        .filter((chave): chave is string => chave !== null && chave.startsWith("kyr:") && chave !== CHAVE);
      for (const chave of chaves) armazenamento.removeItem(chave);
    } catch {
      // Sem acesso ao armazenamento não há o que apagar.
    }
  }
  limparCacheDoAplicativo();
  window.dispatchEvent(new Event("kyr:favoritos"));
}

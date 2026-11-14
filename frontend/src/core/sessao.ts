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
  void apiFetch("/api/auth/sair", { method: "POST" }).catch(() => undefined);
}

/** Chamado quando o servidor responde 401: a sessão do navegador deixa de valer. */
export function esquecerSessao(): void {
  guardarSessao(null);
}

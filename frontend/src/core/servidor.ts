import { cookies } from "next/headers";

// Código que só roda no servidor do Next (rotas em app/api). Repassa as chamadas ao backend-core.
// O token da sessão fica em um cookie httpOnly: o JavaScript da página nunca o enxerga.

export const COOKIE_DA_SESSAO = "kyr_token";
const TRINTA_DIAS_EM_SEGUNDOS = 60 * 60 * 24 * 30;

function urlDoBackend(caminho: string): string {
  const base = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
  return `${base.replace(/\/+$/, "")}${caminho}`;
}

interface OpcoesDeChamada {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  /** Corpo já lido da requisição do navegador; é repassado como JSON. */
  body?: unknown;
  /** Envia o token do cookie em Authorization. Sem cookie, responde 401 sem chamar o backend. */
  autenticado?: boolean;
  /**
   * Requisição do navegador cujo IP é informado ao backend, para os limites de uso por cliente
   * (login, cadastro e geração de roteiros). Ver cabecalhosDoCliente.
   */
  repassarIpDe?: Request;
}

/**
 * IP do navegador, para o backend aplicar os limites por cliente.
 *
 * O X-Forwarded-For que chega aqui pode ter sido escrito pelo próprio navegador. Só vale o que os proxies
 * confiáveis na frente deste servidor anotaram (KYR_PROXIES_CONFIAVEIS, por exemplo 1 atrás do balanceador
 * da hospedagem): o endereço do cliente é o N-ésimo contado do fim. O IP vai ao backend em X-Kyr-Client-Ip,
 * junto com o segredo compartilhado KYR_PROXY_TOKEN; sem o segredo, nada é enviado e o backend usa o
 * endereço da conexão.
 */
export function cabecalhosDoCliente(request: Request): Record<string, string> {
  const token = process.env.KYR_PROXY_TOKEN?.trim();
  const proxies = Number.parseInt(process.env.KYR_PROXIES_CONFIAVEIS ?? "0", 10);
  if (!token || !Number.isFinite(proxies) || proxies < 1) return {};

  const enderecos = (request.headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((endereco) => endereco.trim())
    .filter(Boolean);
  if (enderecos.length === 0) return {};

  const ip = enderecos[Math.max(enderecos.length - proxies, 0)];
  return { "X-Kyr-Client-Ip": ip, "X-Kyr-Proxy-Token": token };
}

export interface RespostaDoBackend {
  status: number;
  corpo: unknown;
}

export async function chamarBackend(caminho: string, opcoes: OpcoesDeChamada = {}): Promise<RespostaDoBackend> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (opcoes.body !== undefined) headers["Content-Type"] = "application/json";
  if (opcoes.repassarIpDe) Object.assign(headers, cabecalhosDoCliente(opcoes.repassarIpDe));

  if (opcoes.autenticado) {
    const token = (await cookies()).get(COOKIE_DA_SESSAO)?.value;
    if (!token) {
      return { status: 401, corpo: { codigo: "nao_autenticado", mensagem: "Entre na sua conta para continuar." } };
    }
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const resposta = await fetch(urlDoBackend(caminho), {
      method: opcoes.method ?? "GET",
      headers,
      body: opcoes.body === undefined ? undefined : JSON.stringify(opcoes.body),
      cache: "no-store",
    });
    const texto = await resposta.text();
    let corpo: unknown = null;
    if (texto) {
      try {
        corpo = JSON.parse(texto);
      } catch {
        corpo = { mensagem: "O servidor devolveu uma resposta inesperada." };
      }
    }
    return { status: resposta.status, corpo };
  } catch {
    return { status: 502, corpo: { codigo: "backend_indisponivel", mensagem: "Não foi possível conectar ao servidor." } };
  }
}

export function responder({ status, corpo }: RespostaDoBackend): Response {
  return status === 204 ? new Response(null, { status }) : Response.json(corpo, { status });
}

export async function lerCorpo(request: Request): Promise<unknown | undefined> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

// Uma Response nova a cada chamada: o corpo de uma Response só pode ser lido uma vez, então uma constante
// compartilhada falharia a partir do segundo pedido inválido ("Body has already been read").
export function corpoInvalido(): Response {
  return Response.json(
    { codigo: "dados_invalidos", mensagem: "O corpo da requisição deve ser JSON válido." },
    { status: 400 },
  );
}

// Cadastro e login devolvem { token, usuario }. O token vai para o cookie e só o usuário vai para a página.
export async function abrirSessao(resposta: RespostaDoBackend): Promise<Response> {
  const corpo = resposta.corpo as { token?: unknown; usuario?: unknown } | null;
  if (resposta.status >= 400 || !corpo || typeof corpo.token !== "string") {
    return responder(resposta);
  }
  (await cookies()).set(COOKIE_DA_SESSAO, corpo.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TRINTA_DIAS_EM_SEGUNDOS,
  });
  return Response.json({ usuario: corpo.usuario }, { status: resposta.status });
}

export async function encerrarSessao(): Promise<void> {
  (await cookies()).delete(COOKIE_DA_SESSAO);
}

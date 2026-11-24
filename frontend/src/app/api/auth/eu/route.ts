import { chamarBackend, corpoInvalido, encerrarSessao, lerCorpo, responder } from "@/core/servidor";

export async function GET() {
  const resposta = await chamarBackend("/auth/eu", { autenticado: true });
  // Sessão vencida ou encerrada em outro lugar: o cookie deixa de servir.
  if (resposta.status === 401) await encerrarSessao();
  return responder(resposta);
}

// Correção do nome da conta (LGPD, art. 18, III).
export async function PUT(request: Request) {
  const corpo = await lerCorpo(request);
  if (corpo === undefined) return corpoInvalido();
  return responder(await chamarBackend("/auth/eu", { method: "PUT", body: corpo, autenticado: true }));
}

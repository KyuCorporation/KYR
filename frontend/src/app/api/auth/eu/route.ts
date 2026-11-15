import { chamarBackend, encerrarSessao, responder } from "@/core/servidor";

export async function GET() {
  const resposta = await chamarBackend("/auth/eu", { autenticado: true });
  // Sessão vencida ou encerrada em outro lugar: o cookie deixa de servir.
  if (resposta.status === 401) await encerrarSessao();
  return responder(resposta);
}

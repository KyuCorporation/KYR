import { chamarBackend, responder } from "@/core/servidor";

export async function GET() {
  const resposta = responder(await chamarBackend("/auth/meus-dados", { autenticado: true }));
  resposta.headers.set("Cache-Control", "no-store");
  return resposta;
}

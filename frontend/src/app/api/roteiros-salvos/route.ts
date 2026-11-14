import { chamarBackend, CORPO_INVALIDO, lerCorpo, responder } from "@/core/servidor";

export async function GET() {
  return responder(await chamarBackend("/roteiros-salvos", { autenticado: true }));
}

export async function POST(request: Request) {
  const corpo = await lerCorpo(request);
  if (corpo === undefined) return CORPO_INVALIDO;
  return responder(await chamarBackend("/roteiros-salvos", { method: "POST", body: corpo, autenticado: true }));
}

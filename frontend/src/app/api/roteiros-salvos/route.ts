import { chamarBackend, corpoInvalido, lerCorpo, responder } from "@/core/servidor";

export async function GET() {
  return responder(await chamarBackend("/roteiros-salvos", { autenticado: true }));
}

export async function POST(request: Request) {
  const corpo = await lerCorpo(request);
  if (corpo === undefined) return corpoInvalido();
  return responder(await chamarBackend("/roteiros-salvos", { method: "POST", body: corpo, autenticado: true }));
}

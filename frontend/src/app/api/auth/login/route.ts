import { abrirSessao, chamarBackend, CORPO_INVALIDO, lerCorpo } from "@/core/servidor";

export async function POST(request: Request) {
  const corpo = await lerCorpo(request);
  if (corpo === undefined) return CORPO_INVALIDO;
  return abrirSessao(await chamarBackend("/auth/login", { method: "POST", body: corpo, repassarIpDe: request }));
}

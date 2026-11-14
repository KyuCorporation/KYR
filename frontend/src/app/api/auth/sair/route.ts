import { chamarBackend, encerrarSessao } from "@/core/servidor";

export async function POST() {
  await chamarBackend("/auth/sair", { method: "POST", autenticado: true });
  await encerrarSessao();
  return new Response(null, { status: 204 });
}

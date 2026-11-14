import { chamarBackend, responder } from "@/core/servidor";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) {
    return Response.json({ codigo: "roteiro_nao_encontrado", mensagem: "Roteiro não encontrado." }, { status: 404 });
  }
  return responder(await chamarBackend(`/roteiros-salvos/${id}`, { method: "DELETE", autenticado: true }));
}

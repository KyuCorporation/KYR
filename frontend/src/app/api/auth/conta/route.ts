import { chamarBackend, CORPO_INVALIDO, encerrarSessao, lerCorpo, responder } from "@/core/servidor";

// Exclusão da conta. Com a conta apagada, o cookie da sessão também deixa de existir.
export async function DELETE(request: Request) {
  const corpo = await lerCorpo(request);
  if (corpo === undefined) return CORPO_INVALIDO;
  const resposta = await chamarBackend("/auth/conta", { method: "DELETE", body: corpo, autenticado: true });
  if (resposta.status === 204) await encerrarSessao();
  return responder(resposta);
}

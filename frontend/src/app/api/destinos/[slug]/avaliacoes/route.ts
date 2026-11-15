import { chamarBackend, CORPO_INVALIDO, lerCorpo, responder } from "@/core/servidor";

type Contexto = { params: Promise<{ slug: string }> };

const NAO_ENCONTRADO = () =>
  Response.json({ codigo: "destino_nao_encontrado", mensagem: "Destino não encontrado." }, { status: 404 });

export async function GET(_request: Request, { params }: Contexto) {
  const { slug } = await params;
  if (!/^[a-z0-9-]{1,120}$/.test(slug)) return NAO_ENCONTRADO();
  return responder(await chamarBackend(`/destinos/${slug}/avaliacoes`));
}

export async function PUT(request: Request, { params }: Contexto) {
  const { slug } = await params;
  if (!/^[a-z0-9-]{1,120}$/.test(slug)) return NAO_ENCONTRADO();
  const corpo = await lerCorpo(request);
  if (corpo === undefined) return CORPO_INVALIDO;
  return responder(await chamarBackend(`/destinos/${slug}/avaliacoes`, { method: "PUT", body: corpo, autenticado: true }));
}

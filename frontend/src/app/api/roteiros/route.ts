import { ApiError, apiFetch } from "@/core/api";
import { cabecalhosDoCliente } from "@/core/servidor";
import type { RespostaRoteiroApi } from "@/types/roteiro";

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return Response.json({ detail: "O corpo da requisição deve ser JSON válido." }, { status: 400 });
  }

  try {
    const result = await apiFetch<RespostaRoteiroApi>("/roteiros", {
      method: "POST",
      // O IP do navegador vai junto para o limite de roteiros por cliente do backend.
      headers: { "Content-Type": "application/json", ...cabecalhosDoCliente(request) },
      body: JSON.stringify(payload),
    });

    return Response.json(result);
  } catch (error) {
    if (error instanceof ApiError) {
      return Response.json(
        { detail: error.message, errors: error.validationMessages },
        { status: error.status ?? (error.code === "timeout" ? 504 : 502) },
      );
    }

    return Response.json(
      { detail: "Não foi possível conectar ao backend." },
      { status: 502 },
    );
  }
}

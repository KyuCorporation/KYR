export interface RoteiroParams {
  origem: string;
  destino: string;
}

/**
 * TODO: integrar com o backend-core (US-05).
 * Ajustar a URL/endpoint correto quando o backend estiver definido.
 */
export async function gerarRoteiro(params: RoteiroParams): Promise<void> {
  console.log("Gerando roteiro com:", params);

  // Exemplo de chamada futura ao backend-core:
  // const response = await fetch("http://localhost:8080/api/roteiro", {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify(params),
  // });
  // return response.json();
}
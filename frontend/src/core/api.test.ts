import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch } from "@/core/api";

function resposta(status: number, corpo: unknown, contentType = "application/json"): Response {
  const texto = typeof corpo === "string" ? corpo : JSON.stringify(corpo);
  return new Response(status === 204 ? null : texto, { status, headers: { "content-type": contentType } });
}

afterEach(() => vi.useRealTimers());

describe("apiFetch", () => {
  it("chama a rota do próprio Next no navegador e devolve o JSON", async () => {
    const fetch = vi.fn().mockResolvedValue(resposta(200, { ok: true }));
    vi.stubGlobal("fetch", fetch);

    await expect(apiFetch("/api/roteiros", { method: "POST" })).resolves.toEqual({ ok: true });

    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("/api/roteiros");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({ Accept: "application/json" });
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("usa a URL pública do backend para caminhos fora de /api, sem barra duplicada", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.exemplo.com/");
    const fetch = vi.fn().mockResolvedValue(resposta(200, []));
    vi.stubGlobal("fetch", fetch);

    await apiFetch("roteiros");

    expect(fetch.mock.calls[0][0]).toBe("https://api.exemplo.com/roteiros");
  });

  it("devolve null em 204 e texto quando a resposta não é JSON", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(resposta(204, null))
      .mockResolvedValueOnce(resposta(200, "pong", "text/plain")));

    await expect(apiFetch("/api/a")).resolves.toBeNull();
    await expect(apiFetch("/api/b")).resolves.toBe("pong");
  });

  it("transforma erros de validação do Spring em mensagens legíveis", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(resposta(400, {
      title: "Bad Request",
      errors: [{ field: "origem", defaultMessage: "é obrigatória" }, "texto solto", 42],
    })));

    const erro = await apiFetch("/api/roteiros").catch((e: unknown) => e);

    expect(erro).toBeInstanceOf(ApiError);
    expect(erro).toMatchObject({
      status: 400,
      code: "http",
      message: "origem: é obrigatória",
      validationMessages: ["origem: é obrigatória", "texto solto"],
    });
  });

  it("usa detail, mensagem ou uma frase padrão quando não há erros de validação", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(resposta(500, { detail: "Falha interna" }))
      .mockResolvedValueOnce(resposta(401, { mensagem: "Entre na sua conta" }))
      .mockResolvedValueOnce(resposta(502, "{json quebrado")));

    await expect(apiFetch("/api/a")).rejects.toMatchObject({ message: "Falha interna", status: 500 });
    await expect(apiFetch("/api/b")).rejects.toMatchObject({ message: "Entre na sua conta", status: 401 });
    await expect(apiFetch("/api/c")).rejects.toMatchObject({
      message: "Não foi possível gerar o roteiro. Tente novamente.",
      status: 502,
    });
  });

  it("avisa que o servidor está acordando e depois desiste por tempo", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn((_url: string, init: RequestInit) => new Promise((_resolve, reject) => {
      init.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
    })));
    const onStatusChange = vi.fn();

    const chamada = apiFetch("/api/roteiros", { timeoutMs: 1000, wakeUpAfterMs: 200, onStatusChange });
    const verificacao = expect(chamada).rejects.toMatchObject({ code: "timeout", status: null });

    await vi.advanceTimersByTimeAsync(200);
    expect(onStatusChange).toHaveBeenCalledWith("waking-server");
    await vi.advanceTimersByTimeAsync(800);
    await verificacao;
  });

  it("explica falha de rede sem expor o erro original", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    await expect(apiFetch("/api/roteiros")).rejects.toMatchObject({
      code: "network",
      message: "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.",
    });
  });
});

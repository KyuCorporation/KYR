import { afterEach, describe, expect, it, vi } from "vitest";
import { gerarRoteiro, normalizarRoteiroResponse } from "@/core/gerarRoteiro";
import { formatRouteTotal } from "@/core/routeMetrics";

const origem = { nome: "Aeroporto de Foz", latitude: -25.5969, longitude: -54.4872 };
const destino = { nome: "Grand Carimã", latitude: -25.6278, longitude: -54.4728 };

afterEach(() => vi.unstubAllGlobals());

describe("gerarRoteiro", () => {
  it("envia apenas origem e destino para POST /roteiros", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      pontos: [],
      metadados: { totalPontos: 0, tempoRespostaMs: 120, fonteIA: "fallback-sem-otimizacao" },
    }), { headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    await gerarRoteiro({ origem, destino });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/roteiros");
    expect(options.method).toBe("POST");
    expect(JSON.parse(String(options.body))).toEqual({ origem, destino });
  });
});

describe("normalizarRoteiroResponse", () => {
  it("gera IDs estáveis e preserva a fonte e os metadados do backend", () => {
    const result = normalizarRoteiroResponse({
      pontos: [{
        nome: "Cataratas do Iguaçu",
        trilha: "turismo",
        tipo: "lazer",
        endereco: "Foz do Iguaçu - PR",
        latitude: -25.6953,
        longitude: -54.4367,
        fonte: "google-directions-api",
        descricao: "Parque nacional",
        distanciaMetros: 19000,
        duracaoSegundos: 1620,
      }],
      metadados: { totalPontos: 1, tempoRespostaMs: 200, fonteIA: "google-directions-api" },
    }, origem, destino);

    expect(result.pontos[0].id).toBe("poi-1-cataratas-do-iguacu");
    expect(result.pontos[0].distanciaMetros).toBe(19000);
    expect(result.metadados.fonteIA).toBe("google-directions-api");
    expect(result.origem).toEqual(origem);
  });

  it("preserva valores nulos de fallback e valores desconhecidos", () => {
    const result = normalizarRoteiroResponse({
      pontos: [{
        nome: "Ponto futuro",
        trilha: "ecoturismo",
        tipo: "observacao",
        endereco: "",
        latitude: null,
        longitude: null,
        fonte: "fallback-sem-otimizacao",
        descricao: "",
        distanciaMetros: null,
        duracaoSegundos: null,
      }],
      metadados: { totalPontos: 1, tempoRespostaMs: null, fonteIA: "fallback-sem-otimizacao" },
    }, origem, destino);

    expect(result.pontos[0]).toMatchObject({
      trilha: "ecoturismo",
      tipo: "observacao",
      latitude: null,
      longitude: null,
      distanciaMetros: null,
      duracaoSegundos: null,
    });
    expect(result.metadados.tempoRespostaMs).toBeNull();
  });
});

describe("formatRouteTotal", () => {
  it("não calcula uma soma quando algum trecho veio nulo", () => {
    expect(formatRouteTotal([1200, null], "distance")).toBe("Indisponível");
    expect(formatRouteTotal([null], "duration")).toBe("Indisponível");
  });
});
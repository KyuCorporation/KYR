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

describe("contrato atual do POST /roteiros", () => {
  const pontoBase = {
    nome: "Marco das Três Fronteiras",
    endereco: "Av. Gen. Meira - Foz do Iguaçu - PR",
    latitude: -25.5925,
    longitude: -54.5912,
    fonte: "https://maps.google.com/?cid=1",
    distanciaMetros: 1200,
    duracaoSegundos: 180,
  };

  it("lê curado por ponto e curadoPorIa e fonteRota dos metadados", () => {
    const result = normalizarRoteiroResponse({
      pontos: [
        { ...pontoBase, trilha: "turismo", tipo: "lazer", descricao: "Mirante na fronteira.", curado: true },
        { ...pontoBase, nome: "Sem curadoria", trilha: null, tipo: null, descricao: null, curado: false },
      ],
      metadados: {
        totalPontos: 2,
        tempoRespostaMs: 900,
        fonteIA: "gemini-3.5-flash-lite",
        curadoPorIa: true,
        fonteRota: "google-directions-api",
      },
    }, origem, destino);

    expect(result.pontos[0].curado).toBe(true);
    expect(result.pontos[1]).toMatchObject({ curado: false, descricao: "" });
    expect(result.metadados).toMatchObject({
      fonteIA: "gemini-3.5-flash-lite",
      curadoPorIa: true,
      fonteRota: "google-directions-api",
    });
  });

  it("trata a resposta sem curadoria e com ordenação em fallback", () => {
    const result = normalizarRoteiroResponse({
      pontos: [{ ...pontoBase, trilha: null, tipo: null, descricao: null, curado: false, distanciaMetros: null, duracaoSegundos: null }],
      metadados: {
        totalPontos: 1,
        tempoRespostaMs: 300,
        fonteIA: "sem-curadoria",
        curadoPorIa: false,
        fonteRota: "fallback-sem-otimizacao",
      },
    }, origem, destino);

    expect(result.metadados.curadoPorIa).toBe(false);
    expect(result.metadados.fonteRota).toBe("fallback-sem-otimizacao");
    expect(result.pontos[0].curado).toBe(false);
  });

  it("deduz curado pela trilha e pelo tipo quando o backend não manda o campo", () => {
    const result = normalizarRoteiroResponse({
      pontos: [{ ...pontoBase, trilha: "compras", tipo: "alimentacao", descricao: "Mercado." }],
      metadados: { totalPontos: 1, tempoRespostaMs: 100, fonteIA: "gemini" },
    }, origem, destino);

    expect(result.pontos[0].curado).toBe(true);
    expect(result.metadados.curadoPorIa).toBe(false);
    expect(result.metadados.fonteRota).toBe("");
  });

  it("mostra a mensagem do backend quando o Google Maps falha (502)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      codigo: "erro_integracao_google_maps",
      mensagem: "Falha de comunicação com a Places API (Forbidden)",
    }), { status: 502, headers: { "Content-Type": "application/json" } })));

    await expect(gerarRoteiro({ origem, destino })).rejects.toMatchObject({
      status: 502,
      message: "Falha de comunicação com a Places API (Forbidden)",
    });
  });
});

describe("paradas e meio de transporte", () => {
  const respostaVazia = () => new Response(JSON.stringify({
    pontos: [{ nome: "Parque das Aves", latitude: -25.615, longitude: -54.4841, curado: false, parada: true, distanciaMetros: 900, duracaoSegundos: 700 }],
    metadados: { totalPontos: 1, tempoRespostaMs: 300, fonteIA: "sem-curadoria", curadoPorIa: false, fonteRota: "google-directions-api", transporte: "WALKING" },
  }), { headers: { "Content-Type": "application/json" } });

  it("envia paradas e transporte quando escolhidos e lê parada e transporte da resposta", async () => {
    const fetchMock = vi.fn().mockResolvedValue(respostaVazia());
    vi.stubGlobal("fetch", fetchMock);
    const parada = { nome: "Parque das Aves", latitude: -25.615, longitude: -54.4841 };

    const resultado = await gerarRoteiro({ origem, destino, paradas: [parada], transporte: "WALKING" });

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(options.body))).toEqual({ origem, destino, paradas: [parada], transporte: "WALKING" });
    expect(resultado.pontos[0].parada).toBe(true);
    expect(resultado.metadados.transporte).toBe("WALKING");
  });

  it("sem paradas e de carro, manda o mesmo corpo de antes", async () => {
    const fetchMock = vi.fn().mockResolvedValue(respostaVazia());
    vi.stubGlobal("fetch", fetchMock);

    await gerarRoteiro({ origem, destino, paradas: [], transporte: "DRIVING" });

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(options.body))).toEqual({ origem, destino });
  });

  it("resposta antiga sem transporte nem parada vale carro e lugar sugerido", () => {
    const result = normalizarRoteiroResponse({
      pontos: [{ nome: "Café" }],
      metadados: { totalPontos: 1, tempoRespostaMs: 1, fonteIA: "x" },
    }, origem, destino);

    expect(result.metadados.transporte).toBe("DRIVING");
    expect(result.pontos[0].parada).toBe(false);
  });
});

describe("formatRouteTotal", () => {
  it("não calcula uma soma quando algum trecho veio nulo", () => {
    expect(formatRouteTotal([1200, null], "distance")).toBe("Indisponível");
    expect(formatRouteTotal([null], "duration")).toBe("Indisponível");
  });
});
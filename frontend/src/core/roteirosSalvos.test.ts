// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  lerRoteirosDoDispositivo,
  listarRoteirosSalvos,
  paraReabrir,
  removerRoteiro,
  salvarRoteiro,
} from "@/core/roteirosSalvos";
import type { RoteiroResponse } from "@/types/roteiro";

const roteiro: RoteiroResponse = {
  origem: { nome: "Aeroporto de Foz", latitude: -25.6, longitude: -54.48 },
  destino: { nome: "Centro", latitude: -25.54, longitude: -54.58 },
  metadados: { totalPontos: 2, tempoRespostaMs: 900, fonteIA: "gemini-3.5-flash-lite", curadoPorIa: true, fonteRota: "google-directions-api", transporte: "DRIVING" },
  pontos: [
    { id: "poi-1", nome: "Paris 6 Bistrô", trilha: "turismo", tipo: "alimentacao", endereco: "Av. das Cataratas, 3570", latitude: -25.57, longitude: -54.54, fonte: "https://maps.google.com/?cid=1", descricao: "Bistrô.", curado: true, distanciaMetros: 100, duracaoSegundos: 60, placeId: "place-paris6", parada: false },
    { id: "poi-2", nome: "Aloa Coffee", trilha: "turismo", tipo: "alimentacao", endereco: "R. Mal. Floriano, 1300", latitude: -25.54, longitude: -54.58, fonte: "https://maps.google.com/?cid=2", descricao: "Café.", curado: true, distanciaMetros: 200, duracaoSegundos: 90, placeId: null, parada: false },
  ],
};

const CHAVE = "kyr:roteiros-salvos";

beforeEach(() => window.localStorage.clear());
afterEach(() => vi.unstubAllGlobals());

describe("roteiros salvos neste dispositivo", () => {
  it("guarda origem, destino, total e IDs dos lugares, mas nenhum nome ou endereço de lugar", async () => {
    const salvo = await salvarRoteiro(roteiro);

    expect(salvo.onde).toBe("dispositivo");
    expect(salvo.totalPontos).toBe(2);
    expect(salvo.placeIds).toEqual(["place-paris6"]);

    const gravado = window.localStorage.getItem(CHAVE) ?? "";
    expect(gravado).toContain("Aeroporto de Foz");
    expect(gravado).not.toContain("Paris 6");
    expect(gravado).not.toContain("Aloa Coffee");
    expect(gravado).not.toContain("Av. das Cataratas");
  });

  it("converte o formato antigo e descarta os nomes de lugares que ele guardava", () => {
    window.localStorage.setItem(CHAVE, JSON.stringify([{
      id: "antigo-1",
      origem: roteiro.origem,
      destino: roteiro.destino,
      pontos: ["Paris 6 Bistrô", "Aloa Coffee", "Fino Corte"],
      destinosAdicionados: ["parque-das-aves"],
      criadoEm: new Date().toISOString(),
    }]));

    const [lido] = lerRoteirosDoDispositivo();

    expect(lido.totalPontos).toBe(3);
    expect(lido.destinosAdicionados).toEqual(["parque-das-aves"]);
    expect(lido.podeReabrir).toBe(true);
    expect(window.localStorage.getItem(CHAVE)).not.toContain("Paris 6");
  });

  it("apaga as coordenadas depois de 30 dias e deixa de permitir reabrir", () => {
    const haQuarentaDias = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString();
    window.localStorage.setItem(CHAVE, JSON.stringify([{
      id: "velho", origem: roteiro.origem, destino: roteiro.destino, totalPontos: 2, placeIds: ["place-paris6"],
      destinosAdicionados: [], criadoEm: haQuarentaDias,
    }]));

    const [lido] = lerRoteirosDoDispositivo();

    expect(lido.origem).toEqual({ nome: "Aeroporto de Foz", latitude: null, longitude: null });
    expect(lido.podeReabrir).toBe(false);
    expect(paraReabrir(lido)).toBeNull();
    expect(lido.placeIds).toEqual(["place-paris6"]);
    expect(window.localStorage.getItem(CHAVE)).not.toContain("-25.6");
  });

  it("devolve origem e destino para gerar de novo um roteiro recente, e remove", async () => {
    const salvo = await salvarRoteiro(roteiro);

    expect(paraReabrir(salvo)).toEqual({ origem: roteiro.origem, destino: roteiro.destino });

    await removerRoteiro(salvo);
    expect(lerRoteirosDoDispositivo()).toEqual([]);
  });
});

describe("roteiros salvos na conta", () => {
  beforeEach(() => window.localStorage.setItem("kyr:sessao", JSON.stringify({ nome: "Ana Lima", email: "ana@exemplo.com" })));

  it("salva pela API, enviando só origem, destino e IDs dos lugares", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      id: 7, origem: roteiro.origem, destino: roteiro.destino, totalPontos: 1, placeIds: ["place-paris6"],
      criadoEm: "2026-11-14T12:00:00Z", podeReabrir: true,
    }), { status: 201, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    const salvo = await salvarRoteiro(roteiro);

    expect(salvo).toMatchObject({ id: "7", onde: "conta" });
    const [url, opcoes] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/roteiros-salvos");
    expect(JSON.parse(String(opcoes.body))).toEqual({ origem: roteiro.origem, destino: roteiro.destino, placeIds: ["place-paris6"] });
    expect(window.localStorage.getItem(CHAVE)).toBeNull();
  });

  it("com a sessão vencida, salva neste dispositivo e esquece a sessão", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      codigo: "nao_autenticado", mensagem: "Entre na sua conta para continuar.",
    }), { status: 401, headers: { "Content-Type": "application/json" } })));

    const salvo = await salvarRoteiro(roteiro);

    expect(salvo.onde).toBe("dispositivo");
    expect(window.localStorage.getItem("kyr:sessao")).toBeNull();
  });

  it("lista os da conta antes dos que estão só neste dispositivo", async () => {
    window.localStorage.removeItem("kyr:sessao");
    await salvarRoteiro(roteiro);
    window.localStorage.setItem("kyr:sessao", JSON.stringify({ nome: "Ana Lima", email: "ana@exemplo.com" }));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify([{
      id: 7, origem: roteiro.origem, destino: roteiro.destino, totalPontos: 5, placeIds: [],
      criadoEm: "2026-11-14T12:00:00Z", podeReabrir: true,
    }]), { headers: { "Content-Type": "application/json" } })));

    const lista = await listarRoteirosSalvos();

    expect(lista.map((item) => item.onde)).toEqual(["conta", "dispositivo"]);
  });
});

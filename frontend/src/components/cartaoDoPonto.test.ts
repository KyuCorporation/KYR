import { describe, expect, it } from "vitest";
import { formatarDistancia, formatarDuracao, montarCartaoDoPonto } from "@/components/cartaoDoPonto";
import type { PontoDeInteresse } from "@/types/roteiro";

const ponto: PontoDeInteresse = {
  id: "poi-1",
  nome: "Marco das Três Fronteiras",
  trilha: "turismo",
  tipo: "lazer",
  endereco: "Av. Gen. Meira, Foz do Iguaçu - PR",
  latitude: -25.59,
  longitude: -54.59,
  fonte: "https://maps.google.com/?cid=1",
  descricao: "Mirante no encontro de três países.",
  curado: true,
  distanciaMetros: 1200,
  duracaoSegundos: 240,
  placeId: "place-marco",
  parada: false,
};

describe("montarCartaoDoPonto", () => {
  it("mostra ordem, nome, etiquetas, descrição, trecho, endereço e link do Google Maps", () => {
    const html = montarCartaoDoPonto(ponto, 3, "Aeroporto");

    expect(html).toContain(">3<");
    expect(html).toContain("Marco das Três Fronteiras");
    expect(html).toContain("Turismo");
    expect(html).toContain("Lazer");
    expect(html).toContain("Mirante no encontro de três países.");
    expect(html).toContain("1,2 km");
    expect(html).toContain("4 min de carro a partir de Aeroporto");
    expect(html).toContain("Av. Gen. Meira");
    expect(html).toContain('href="https://maps.google.com/?cid=1"');
  });

  it("não mostra etiquetas nem trecho de um ponto sem curadoria e sem ordenação", () => {
    const html = montarCartaoDoPonto(
      { ...ponto, trilha: "desconhecida" as never, tipo: "desconhecido" as never, descricao: "", curado: false, distanciaMetros: null, duracaoSegundos: null },
      1,
    );

    expect(html).not.toContain("desconhecid");
    expect(html).not.toContain("de carro");
    expect(html).toContain("Marco das Três Fronteiras");
  });

  it("escapa HTML vindo dos dados", () => {
    const html = montarCartaoDoPonto({ ...ponto, nome: '<img src=x onerror="alert(1)">', descricao: "<script>x</script>" }, 1);

    expect(html).not.toContain("<img");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;img");
  });

  it("só cria link para endereços https", () => {
    const html = montarCartaoDoPonto({ ...ponto, fonte: "javascript:alert(1)" }, 1);

    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("Abrir no Google Maps");
  });
});

describe("cartão de uma parada", () => {
  it("marca como sua parada e usa o meio de transporte no trecho", () => {
    const html = montarCartaoDoPonto({ ...ponto, curado: false, parada: true }, 2, "Aeroporto", "WALKING");

    expect(html).toContain("Sua parada");
    expect(html).toContain("a pé a partir de Aeroporto");
    expect(html).not.toContain("Turismo");
  });
});

describe("formatadores do trecho", () => {
  it("formata metros, quilômetros, minutos e horas", () => {
    expect(formatarDistancia(850)).toBe("850 m");
    expect(formatarDistancia(12500)).toBe("12,5 km");
    expect(formatarDistancia(null)).toBeNull();
    expect(formatarDuracao(20)).toBe("1 min");
    expect(formatarDuracao(5400)).toBe("1h 30min");
    expect(formatarDuracao(null)).toBeNull();
  });
});

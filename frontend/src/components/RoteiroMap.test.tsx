import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RoteiroMap from "@/components/RoteiroMap";
import { instalarGoogleMapsFalso, type MapasCriados } from "@/test/googleMapsFalso";
import type { PontoDeInteresse } from "@/types/roteiro";

const script = vi.hoisted(() => ({ carregado: true, erro: null as string | null }));
vi.mock("@/hooks/useGoogleMapsScript", () => ({ useGoogleMapsScript: () => script }));

const ROTA = {
  origem: { nome: "Aeroporto", latitude: -25.59, longitude: -54.49 },
  destino: { nome: "Centro", latitude: -25.54, longitude: -54.58 },
};

function ponto(id: string, extra: Partial<PontoDeInteresse> = {}): PontoDeInteresse {
  return {
    id,
    nome: `Lugar ${id}`,
    trilha: "turismo",
    tipo: "lazer",
    endereco: "Foz do Iguaçu",
    latitude: -25.57,
    longitude: -54.53,
    fonte: "https://maps.google.com/?cid=1",
    descricao: "Descrição.",
    curado: true,
    distanciaMetros: 1000,
    duracaoSegundos: 120,
    placeId: null,
    parada: false,
    ...extra,
  };
}

const PONTOS = [
  ponto("p1", { nome: "Parque das Aves", trilha: "turismo" }),
  ponto("p2", { nome: "Marco", parada: true }),
  ponto("sem-coordenadas", { latitude: null, longitude: null }),
  ponto("p3", { nome: "Loja", trilha: "desconhecida" as never }),
];

let mapas: MapasCriados;

beforeEach(() => {
  script.carregado = true;
  script.erro = null;
  mapas = instalarGoogleMapsFalso();
});

describe("RoteiroMap", () => {
  it("explica quando o mapa não carrega e quando ainda está carregando", () => {
    script.erro = "Chave do Google Maps não configurada.";
    const { rerender } = render(<RoteiroMap pontos={PONTOS} />);
    expect(screen.getByRole("alert").textContent).toContain("Chave do Google Maps não configurada.");

    script.erro = null;
    script.carregado = false;
    rerender(<RoteiroMap pontos={PONTOS} />);
    expect(screen.getByRole("status").textContent).toBe("Carregando mapa...");
    expect(mapas.mapas).toHaveLength(0);
  });

  it("avisa quando não há pontos com coordenadas nem rota", () => {
    render(<RoteiroMap pontos={[ponto("x", { latitude: null, longitude: null })]} />);

    expect(screen.getByText("Nenhum ponto com coordenadas para exibir no mapa.")).toBeTruthy();
    expect(mapas.mapas).toHaveLength(0);
  });

  it("marca origem, destino e os pontos na ordem da lista, com a cor da trilha ou da parada", () => {
    render(<RoteiroMap pontos={PONTOS} rota={ROTA} />);

    expect(mapas.marcadores.map((m) => m.rotulo)).toEqual(["O", "D", "1", "2", "3"]);
    expect(mapas.marcadores.map((m) => m.titulo)).toEqual([
      "Origem: Aeroporto",
      "Destino: Centro",
      "1. Parque das Aves",
      "2. Marco",
      "3. Loja",
    ]);
    const [, , turismo, parada, desconhecida] = mapas.marcadores.map((m) => m.cor);
    expect(turismo).toBe("#059669");
    expect(parada).toBe("#c2410c");
    expect(desconhecida).toBe("#71717a");
  });

  it("pede a rota por ruas na ordem do roteiro e avisa enquanto calcula", async () => {
    const onErroRota = vi.fn();
    render(<RoteiroMap pontos={PONTOS} rota={ROTA} transporte="WALKING" onErroRota={onErroRota} />);

    expect(screen.getByText("Calculando trajeto pelas ruas…")).toBeTruthy();
    const [{ pedido, resolver }] = mapas.rotas;
    expect(pedido).toMatchObject({
      origin: { lat: -25.59, lng: -54.49 },
      destination: { lat: -25.54, lng: -54.58 },
      optimizeWaypoints: false,
      travelMode: "WALKING",
    });
    expect((pedido.waypoints as unknown[]).length).toBe(3);

    await act(async () => resolver({ routes: [] }));

    expect(mapas.renderizadores[0].setDirections).toHaveBeenCalledWith({ routes: [] });
    expect(onErroRota).toHaveBeenCalledWith(null);
    await waitFor(() => expect(screen.queryByText("Calculando trajeto pelas ruas…")).toBeNull());
  });

  it("mantém os pontos e avisa quando a rota por ruas falha", async () => {
    const onErroRota = vi.fn();
    render(<RoteiroMap pontos={PONTOS} rota={ROTA} onErroRota={onErroRota} />);

    await act(async () => mapas.rotas[0].rejeitar(new Error("ZERO_RESULTS")));

    expect(onErroRota).toHaveBeenCalledWith("Não foi possível calcular a rota por ruas. Os pontos continuam disponíveis no mapa.");
    expect(mapas.marcadores).toHaveLength(5);
    expect(screen.queryByText("Calculando trajeto pelas ruas…")).toBeNull();
  });

  it("no transporte público liga os pontos em linha reta, sem pedir rota à Directions", () => {
    render(<RoteiroMap pontos={PONTOS} rota={ROTA} transporte="TRANSIT" />);

    expect(mapas.rotas).toHaveLength(0);
    expect(mapas.linhas).toHaveLength(1);
    expect((mapas.linhas[0].opcoes.path as unknown[]).length).toBe(3);
    expect(screen.queryByText("Calculando trajeto pelas ruas…")).toBeNull();
  });

  it("sem rota, centraliza um ponto único e enquadra vários", () => {
    const { rerender } = render(<RoteiroMap pontos={[PONTOS[0]]} />);
    expect(mapas.mapas[0].setZoom).toHaveBeenCalledWith(14);
    expect(mapas.linhas).toHaveLength(0);

    rerender(<RoteiroMap pontos={PONTOS} />);
    expect(mapas.mapas[0].fitBounds).toHaveBeenCalled();
    expect(mapas.linhas).toHaveLength(1);
  });

  it("clicar no marcador abre o cartão do ponto e avisa a lista", () => {
    const onSelecionarPonto = vi.fn();
    render(<RoteiroMap pontos={PONTOS} rota={ROTA} onSelecionarPonto={onSelecionarPonto} />);

    mapas.marcadores[2].clicar();

    expect(onSelecionarPonto).toHaveBeenCalledWith("p1");
    expect(mapas.janelas[0].setContent.mock.calls[0][0]).toContain("Parque das Aves");
    expect(mapas.janelas[0].open).toHaveBeenCalled();
  });

  it("selecionar um ponto pela lista centraliza o mapa nele", () => {
    const { rerender } = render(<RoteiroMap pontos={PONTOS} rota={ROTA} />);

    rerender(<RoteiroMap pontos={PONTOS} rota={ROTA} pontoSelecionadoId="p2" />);

    expect(mapas.mapas[0].panTo).toHaveBeenCalledWith({ lat: -25.57, lng: -54.53 });
    expect(mapas.janelas[0].setContent.mock.calls.at(-1)?.[0]).toContain("Marco");
  });

  it("ao trocar os pontos, apaga os marcadores antigos em vez de duplicar", () => {
    const { rerender } = render(<RoteiroMap pontos={PONTOS} />);
    const antigos = [...mapas.marcadores];

    rerender(<RoteiroMap pontos={[ponto("novo")]} />);

    for (const marcador of antigos) expect(marcador.setMap).toHaveBeenCalledWith(null);
    expect(mapas.mapas).toHaveLength(1);
  });

  it("ignora a resposta da rota que chega depois de o mapa sair da tela", async () => {
    const { unmount } = render(<RoteiroMap pontos={PONTOS} rota={ROTA} />);
    const renderizador = mapas.renderizadores[0];

    unmount();
    await act(async () => mapas.rotas[0].resolver({ routes: [] }));

    expect(renderizador.setMap).toHaveBeenCalledWith(null);
    expect(renderizador.setDirections).not.toHaveBeenCalled();
  });
});

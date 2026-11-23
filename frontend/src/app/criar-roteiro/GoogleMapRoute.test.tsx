import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import GoogleMapRoute from "@/app/criar-roteiro/GoogleMapRoute";
import { instalarGoogleMapsFalso, type MapasCriados } from "@/test/googleMapsFalso";

const script = vi.hoisted(() => ({ carregado: true, erro: null as string | null }));
vi.mock("@/hooks/useGoogleMapsScript", () => ({ useGoogleMapsScript: () => script }));

const ORIGEM = "-25.59,-54.49";
const DESTINO = "-25.54,-54.58";

function trechos(...valores: Array<[number, number]>) {
  return { routes: [{ legs: valores.map(([metros, segundos]) => ({ distance: { value: metros }, duration: { value: segundos } })) }] };
}

let mapas: MapasCriados;

beforeEach(() => {
  script.carregado = true;
  script.erro = null;
  mapas = instalarGoogleMapsFalso();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("GoogleMapRoute", () => {
  it("mostra o motivo quando o mapa não carrega", () => {
    script.erro = "Falha ao carregar o script do Google Maps.";
    render(<GoogleMapRoute origin={ORIGEM} destination={DESTINO} waypoints={[]} travelMode="DRIVING" />);

    expect(screen.getByRole("alert").textContent).toContain("Falha ao carregar o script do Google Maps.");
    expect(mapas.mapas).toHaveLength(0);
  });

  it("sem origem ou destino limpa a rota e não consulta o Google", () => {
    const onRouteInfo = vi.fn();
    const onError = vi.fn();
    render(<GoogleMapRoute origin="" destination={DESTINO} waypoints={[]} travelMode="DRIVING" onRouteInfo={onRouteInfo} onError={onError} />);

    expect(mapas.rotas).toHaveLength(0);
    expect(mapas.renderizadores[0].set).toHaveBeenCalledWith("directions", null);
    expect(onRouteInfo).toHaveBeenCalledWith(null);
    expect(onError).toHaveBeenCalledWith(null);
  });

  it("pede a rota com as paradas na ordem e soma distância e tempo dos trechos", async () => {
    const onRouteInfo = vi.fn();
    render(
      <GoogleMapRoute origin={ORIGEM} destination={DESTINO} waypoints={["-25.6,-54.5", "", "-25.61,-54.51"]} travelMode="BICYCLING" onRouteInfo={onRouteInfo} />,
    );

    const [{ pedido, resolver }] = mapas.rotas;
    expect(pedido).toMatchObject({
      origin: ORIGEM,
      destination: DESTINO,
      travelMode: "BICYCLING",
      waypoints: [
        { location: "-25.6,-54.5", stopover: true },
        { location: "-25.61,-54.51", stopover: true },
      ],
    });

    await act(async () => resolver(trechos([12_300, 2_700], [8_450, 1_500])));

    // Formato brasileiro, como na tela de resultado: vírgula decimal.
    expect(onRouteInfo).toHaveBeenLastCalledWith({ distanceText: "20,8 km", durationText: "1h 10min" });
    expect(mapas.renderizadores[0].setDirections).toHaveBeenCalled();
  });

  it("mostra metros e minutos em trajetos curtos", async () => {
    const onRouteInfo = vi.fn();
    render(<GoogleMapRoute origin={ORIGEM} destination={DESTINO} waypoints={[]} travelMode="WALKING" onRouteInfo={onRouteInfo} />);

    await act(async () => mapas.rotas[0].resolver(trechos([850, 610])));

    expect(onRouteInfo).toHaveBeenLastCalledWith({ distanceText: "850 m", durationText: "10 min" });
  });

  it.each([
    ["ZERO_RESULTS", "TRANSIT", "Não encontramos rota de transporte público"],
    ["ZERO_RESULTS", "DRIVING", "Não encontramos uma rota entre esses endereços"],
    ["NOT_FOUND", "DRIVING", "Não foi possível localizar um dos endereços"],
    ["OVER_QUERY_LIMIT", "DRIVING", "Verifique a chave de API configurada"],
    ["REQUEST_DENIED", "WALKING", "Verifique a chave de API configurada"],
    ["UNKNOWN_ERROR", "DRIVING", "Confira os endereços e tente novamente"],
  ] as const)("traduz o erro %s da Directions (%s) para o usuário", async (codigo, modo, trecho) => {
    const onError = vi.fn();
    const onRouteInfo = vi.fn();
    render(<GoogleMapRoute origin={ORIGEM} destination={DESTINO} waypoints={[]} travelMode={modo} onError={onError} onRouteInfo={onRouteInfo} />);

    await act(async () => mapas.rotas[0].rejeitar({ code: codigo }));

    expect(onError.mock.calls.at(-1)?.[0]).toContain(trecho);
    expect(onRouteInfo).toHaveBeenLastCalledWith(null);
    expect(mapas.renderizadores[0].set).toHaveBeenCalledWith("directions", null);
  });

  it("recalcula ao trocar o meio de transporte e ignora a resposta da consulta anterior", async () => {
    const onRouteInfo = vi.fn();
    const { rerender } = render(
      <GoogleMapRoute origin={ORIGEM} destination={DESTINO} waypoints={[]} travelMode="DRIVING" onRouteInfo={onRouteInfo} />,
    );
    rerender(<GoogleMapRoute origin={ORIGEM} destination={DESTINO} waypoints={[]} travelMode="WALKING" onRouteInfo={onRouteInfo} />);

    expect(mapas.rotas.map((r) => r.pedido.travelMode)).toEqual(["DRIVING", "WALKING"]);
    await act(async () => mapas.rotas[0].resolver(trechos([20_000, 1_800])));
    expect(onRouteInfo).not.toHaveBeenCalledWith({ distanceText: "20 km", durationText: "30 min" });

    await act(async () => mapas.rotas[1].resolver(trechos([9_000, 6_000])));
    expect(onRouteInfo).toHaveBeenLastCalledWith({ distanceText: "9 km", durationText: "1h 40min" });
  });

  it("ao sair da tela, desliga o desenho da rota", () => {
    const { unmount } = render(<GoogleMapRoute origin={ORIGEM} destination={DESTINO} waypoints={[]} travelMode="DRIVING" />);

    unmount();

    expect(mapas.renderizadores[0].setMap).toHaveBeenCalledWith(null);
  });
});

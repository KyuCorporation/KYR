import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DestinoDetalheClient from "@/app/destinos/[slug]/DestinoDetalheClient";
import { buscarDestino } from "@/core/destinos";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element -- substituto do next/image só nos testes
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

const MARCO = buscarDestino("marco-das-tres-fronteiras")!;

beforeEach(() => push.mockReset());

describe("tela Detalhe do destino", () => {
  it("mostra os dados do destino, a foto com crédito e troca de aba", () => {
    render(<DestinoDetalheClient destino={MARCO} />);

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Marco das Três Fronteiras, Foz do Iguaçu");
    expect(screen.getByAltText(MARCO.imagemAlt)).toBeTruthy();
    expect(screen.getByText(MARCO.descricao)).toBeTruthy();
    expect(screen.getByRole("link", { name: MARCO.licenca }).getAttribute("href")).toBe(MARCO.licencaUrl);

    fireEvent.click(screen.getByRole("button", { name: "Fatos" }));
    expect(screen.getByText(MARCO.endereco)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Fatos" }).getAttribute("aria-current")).toBe("page");

    fireEvent.click(screen.getByRole("button", { name: "Dicas" }));
    expect(screen.getByText("Melhor época indicada: fim da tarde.")).toBeTruthy();
  });

  it("carrega as avaliações do Kyr na aba Avaliações", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ media: null, total: 0, avaliacoes: [] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetch);
    render(<DestinoDetalheClient destino={MARCO} />);

    fireEvent.click(screen.getByRole("button", { name: "Avaliações" }));

    expect(await screen.findByText("Este destino ainda não tem avaliações de viajantes do Kyr.")).toBeTruthy();
    expect(fetch.mock.calls[0][0]).toBe("/api/destinos/marco-das-tres-fronteiras/avaliacoes");
  });

  it("cria uma rota nova já com o destino como parada", () => {
    render(<DestinoDetalheClient destino={MARCO} />);

    fireEvent.click(screen.getByRole("button", { name: /Adicionar à rota/ }));
    expect(screen.getByText(/Nenhuma rota salva neste dispositivo/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Criar nova rota/ }));

    expect(push).toHaveBeenCalledWith("/criar-roteiro");
    expect(JSON.parse(window.sessionStorage.getItem("kyr:pending-destination") ?? "{}")).toMatchObject({
      id: "marco-das-tres-fronteiras",
      name: "Marco das Três Fronteiras - PR",
      latitude: MARCO.coordenadas.latitude,
      longitude: MARCO.coordenadas.longitude,
      categories: ["Cultura", "História"],
    });
  });

  it("adiciona o destino a um roteiro salvo neste dispositivo", () => {
    window.localStorage.setItem("kyr:roteiros-salvos", JSON.stringify([{
      id: "r1",
      origem: { nome: "Aeroporto", latitude: -25.59, longitude: -54.49 },
      destino: { nome: "Centro", latitude: -25.54, longitude: -54.58 },
      totalPontos: 4,
      placeIds: [],
      destinosAdicionados: [],
      criadoEm: new Date().toISOString(),
    }]));
    render(<DestinoDetalheClient destino={MARCO} />);

    fireEvent.click(screen.getByRole("button", { name: /Adicionar à rota/ }));
    fireEvent.click(screen.getByRole("button", { name: /Aeroporto → Centro/ }));

    expect(screen.getByText("Adicionado a Aeroporto → Centro.")).toBeTruthy();
    expect(window.localStorage.getItem("kyr:roteiros-salvos")).toContain("marco-das-tres-fronteiras");

    fireEvent.click(screen.getByRole("button", { name: "Fechar" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("copia o link quando o navegador não tem compartilhamento nativo", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { ...window.navigator, share: undefined, clipboard: { writeText } });
    render(<DestinoDetalheClient destino={MARCO} />);

    fireEvent.click(screen.getByRole("button", { name: "Compartilhar destino" }));

    expect(await screen.findByText("Link copiado.")).toBeTruthy();
    expect(writeText).toHaveBeenCalledWith(window.location.href);
  });

  it("avisa quando não consegue compartilhar", async () => {
    vi.stubGlobal("navigator", { ...window.navigator, share: vi.fn().mockRejectedValue(new Error("cancelado")) });
    render(<DestinoDetalheClient destino={MARCO} />);

    fireEvent.click(screen.getByRole("button", { name: "Compartilhar destino" }));

    await waitFor(() => expect(screen.getByText("Não foi possível compartilhar agora.")).toBeTruthy());
  });
});

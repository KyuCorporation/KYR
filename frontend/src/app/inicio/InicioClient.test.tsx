import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import InicioClient from "@/app/inicio/InicioClient";
import { DESTINOS } from "@/core/destinos";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element -- substituto do next/image só nos testes
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

beforeEach(() => push.mockReset());

describe("tela Início", () => {
  it("mostra os destinos em destaque e um atalho por categoria", () => {
    render(<InicioClient />);

    for (const destino of DESTINOS) {
      expect(screen.getByRole("link", { name: new RegExp(destino.nome) }).getAttribute("href")).toBe(`/destinos/${destino.slug}`);
    }
    expect(screen.getByRole("link", { name: "Cultura" }).getAttribute("href")).toBe("/explorar?categoria=Cultura");
    expect(screen.getByRole("link", { name: "Engenharia" })).toBeTruthy();
  });

  it("leva a busca para a tela Explorar", () => {
    render(<InicioClient />);
    const busca = screen.getByLabelText("Buscar destinos");

    fireEvent.change(busca, { target: { value: "  Pôr do sol " } });
    fireEvent.submit(screen.getByRole("search"));
    expect(push).toHaveBeenLastCalledWith("/explorar?q=P%C3%B4r%20do%20sol");

    fireEvent.change(busca, { target: { value: "   " } });
    fireEvent.submit(screen.getByRole("search"));
    expect(push).toHaveBeenLastCalledWith("/explorar");
  });
});

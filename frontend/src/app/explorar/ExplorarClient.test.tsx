import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ExplorarClient from "@/app/explorar/ExplorarClient";
import { DESTINOS } from "@/core/destinos";
import { FAVORITOS_KEY } from "@/core/favoritos";

// O next/image depende do servidor de imagens do Next; nos testes basta um <img> comum.
vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element -- substituto do next/image só nos testes
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

const nomesNaTela = () => screen.queryAllByRole("heading", { level: 3 }).map((titulo) => titulo.textContent);

function selecionar(rotulo: string, valor: string) {
  fireEvent.change(screen.getByRole("combobox", { name: rotulo }), { target: { value: valor } });
}

describe("tela Explorar", () => {
  it("lista todos os destinos do catálogo com link para o detalhe", () => {
    render(<ExplorarClient />);

    expect(nomesNaTela()).toEqual(DESTINOS.map((destino) => destino.nome));
    expect(screen.getByText(`${DESTINOS.length} destinos`)).toBeTruthy();
    expect(screen.getByRole("link", { name: /Itaipu Binacional/ }).getAttribute("href")).toBe("/destinos/itaipu-binacional");
  });

  it("filtra por texto, categoria, experiência e duração", () => {
    render(<ExplorarClient />);

    fireEvent.change(screen.getByPlaceholderText(/Buscar destinos/), { target: { value: "ecoturismo" } });
    expect(nomesNaTela()).toEqual(["Cataratas do Iguaçu", "Parque das Aves"]);

    fireEvent.click(screen.getByRole("button", { name: /Limpar/ }));
    selecionar("Categorias", "Cultura");
    expect(nomesNaTela()).toEqual(["Marco das Três Fronteiras", "Templo Budista Chen Tien"]);

    selecionar("Categorias", "Todas");
    selecionar("Experiência", "Tecnologia");
    expect(nomesNaTela()).toEqual(["Itaipu Binacional"]);

    selecionar("Experiência", "Todas");
    selecionar("Duração da visita", "Até 1 hora");
    expect(nomesNaTela()).toEqual(["Marco das Três Fronteiras", "Templo Budista Chen Tien"]);
  });

  it("mostra o estado vazio e limpa os filtros", () => {
    render(<ExplorarClient />);

    fireEvent.change(screen.getByPlaceholderText(/Buscar destinos/), { target: { value: "praia" } });
    expect(screen.getByText("Nenhum destino encontrado com esses filtros.")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));
    expect(nomesNaTela()).toHaveLength(DESTINOS.length);
  });

  it("aplica a busca e a categoria vindas da URL", async () => {
    window.history.pushState({}, "", "/explorar?categoria=Natureza&q=aves");
    render(<ExplorarClient />);

    expect(await screen.findByDisplayValue("aves")).toBeTruthy();
    expect(nomesNaTela()).toEqual(["Parque das Aves"]);
    window.history.pushState({}, "", "/");
  });

  it("em Favoritos mostra só os salvos e some com o destino desfavoritado", async () => {
    window.localStorage.setItem(FAVORITOS_KEY, JSON.stringify(["itaipu-binacional"]));
    render(<ExplorarClient somenteFavoritos />);

    const cartao = (await screen.findByRole("heading", { name: "Itaipu Binacional" })).closest("article")!;
    expect(nomesNaTela()).toEqual(["Itaipu Binacional"]);

    fireEvent.click(await within(cartao).findByRole("button", { name: "Remover dos favoritos" }));

    expect(await screen.findByText("Você ainda não salvou destinos.")).toBeTruthy();
  });
});

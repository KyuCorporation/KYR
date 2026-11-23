import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ExploreSidebar from "@/components/ExploreSidebar";

describe("ExploreSidebar", () => {
  it("marca a página atual e lembra se o menu foi expandido", async () => {
    render(<ExploreSidebar active="explorar" />);

    expect(screen.getByRole("link", { name: "Explorar" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: "Início" }).getAttribute("aria-current")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Expandir menu" }));

    expect(screen.getByRole("button", { name: "Recolher menu" }).getAttribute("aria-expanded")).toBe("true");
    expect(window.localStorage.getItem("kyr:sidebar-expandida")).toBe("1");
    expect(screen.getByRole("link", { name: "Criar conta" }).getAttribute("href")).toBe("/cadastro");
  });

  it("cumprimenta quem está logado e permite sair", async () => {
    window.localStorage.setItem("kyr:sidebar-expandida", "1");
    window.localStorage.setItem("kyr:sessao", JSON.stringify({ nome: "Ana Viajante", email: "ana@exemplo.com" }));
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetch);
    render(<ExploreSidebar active="inicio" />);

    expect(await screen.findByText("Olá, Ana")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Minha conta" }).getAttribute("href")).toBe("/conta");
    fireEvent.click(screen.getByRole("button", { name: "Sair" }));

    expect(screen.getByText("Salve suas rotas")).toBeTruthy();
    expect(window.localStorage.getItem("kyr:sessao")).toBeNull();
    expect(fetch).toHaveBeenCalledWith("/api/auth/sair", expect.objectContaining({ method: "POST" }));
  });

  it("recolhido, o atalho da conta leva para Minha conta de quem está logado", async () => {
    window.localStorage.setItem("kyr:sessao", JSON.stringify({ nome: "Ana Viajante", email: "ana@exemplo.com" }));
    render(<ExploreSidebar active="historico" />);

    const conta = await screen.findByRole("link", { name: "Conta de Ana Viajante" });
    expect(conta.getAttribute("href")).toBe("/conta");
  });
});

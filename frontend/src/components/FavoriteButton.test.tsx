import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import FavoriteButton from "@/components/FavoriteButton";
import { FAVORITOS_KEY } from "@/core/favoritos";

describe("FavoriteButton", () => {
  it("lê o estado salvo e alterna sem seguir o link do cartão", async () => {
    window.localStorage.setItem(FAVORITOS_KEY, JSON.stringify(["parque-das-aves"]));
    const cliqueNoCartao = vi.fn();
    render(
      <div onClick={cliqueNoCartao}>
        <FavoriteButton slug="parque-das-aves" />
      </div>,
    );

    const botao = await screen.findByRole("button", { name: "Remover dos favoritos" });
    expect(botao.getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(botao);

    expect(screen.getByRole("button", { name: "Adicionar aos favoritos" }).getAttribute("aria-pressed")).toBe("false");
    expect(window.localStorage.getItem(FAVORITOS_KEY)).toBe("[]");
    expect(cliqueNoCartao).not.toHaveBeenCalled();
  });
});

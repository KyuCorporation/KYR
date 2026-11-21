import { describe, expect, it, vi } from "vitest";
import { alternarFavorito, FAVORITOS_KEY, lerFavoritos } from "@/core/favoritos";

describe("favoritos", () => {
  it("começa vazio e alterna um destino entre favorito e não favorito", () => {
    const aviso = vi.fn();
    window.addEventListener("kyr:favoritos", aviso);

    expect(lerFavoritos()).toEqual([]);
    expect(alternarFavorito("parque-das-aves")).toEqual(["parque-das-aves"]);
    expect(alternarFavorito("itaipu-binacional")).toEqual(["parque-das-aves", "itaipu-binacional"]);
    expect(alternarFavorito("parque-das-aves")).toEqual(["itaipu-binacional"]);
    expect(JSON.parse(window.localStorage.getItem(FAVORITOS_KEY) ?? "[]")).toEqual(["itaipu-binacional"]);
    expect(aviso).toHaveBeenCalledTimes(3);

    window.removeEventListener("kyr:favoritos", aviso);
  });

  it("ignora conteúdo inválido no armazenamento", () => {
    window.localStorage.setItem(FAVORITOS_KEY, "{não é json");
    expect(lerFavoritos()).toEqual([]);

    window.localStorage.setItem(FAVORITOS_KEY, JSON.stringify({ slug: "x" }));
    expect(lerFavoritos()).toEqual([]);

    window.localStorage.setItem(FAVORITOS_KEY, JSON.stringify(["cataratas-do-iguacu", 7, null]));
    expect(lerFavoritos()).toEqual(["cataratas-do-iguacu"]);
  });
});

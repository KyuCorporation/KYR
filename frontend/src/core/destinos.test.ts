import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buscarDestino, DESTINOS } from "@/core/destinos";

describe("catálogo de destinos", () => {
  it("tem slugs únicos e aceitos pela rota de avaliações", () => {
    const slugs = DESTINOS.map((destino) => destino.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9-]{1,120}$/);
  });

  it("aponta para imagens que existem em public/ e traz crédito e licença", () => {
    for (const destino of DESTINOS) {
      expect(existsSync(join(process.cwd(), "public", destino.imagem))).toBe(true);
      expect(destino.imagemAlt.trim()).not.toBe("");
      expect(destino.credito.trim()).not.toBe("");
      expect(destino.licencaUrl).toMatch(/^https:\/\/creativecommons\.org\//);
    }
  });

  it("fica na região de Foz do Iguaçu", () => {
    for (const { coordenadas } of DESTINOS) {
      expect(coordenadas.latitude).toBeGreaterThan(-26);
      expect(coordenadas.latitude).toBeLessThan(-25);
      expect(coordenadas.longitude).toBeGreaterThan(-55);
      expect(coordenadas.longitude).toBeLessThan(-54);
    }
  });

  it("busca por slug", () => {
    expect(buscarDestino("itaipu-binacional")?.nome).toBe("Itaipu Binacional");
    expect(buscarDestino("nao-existe")).toBeUndefined();
  });
});

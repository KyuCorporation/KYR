import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Os dois hooks leem a chave do Google no carregamento do módulo; por isso cada teste
// define a chave e importa os módulos de novo.
async function carregarHooks(chave: string) {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY", chave);
  const [{ useGoogleMapsScript }, { usePlacesAutocomplete }] = await Promise.all([
    import("@/hooks/useGoogleMapsScript"),
    import("@/hooks/usePlacesAutocomplete"),
  ]);
  return { useGoogleMapsScript, usePlacesAutocomplete };
}

const fetchAutocompleteSuggestions = vi.fn();
const importLibrary = vi.fn();

function predicao(placeId: string | undefined, texto: string, lugar: Record<string, unknown> = {}) {
  return {
    placeId,
    text: { text: texto, toString: () => texto },
    toPlace: () => ({ fetchFields: vi.fn().mockResolvedValue(undefined), ...lugar }),
  };
}

beforeEach(() => {
  fetchAutocompleteSuggestions.mockReset();
  importLibrary.mockReset().mockResolvedValue({
    AutocompleteSuggestion: { fetchAutocompleteSuggestions },
    AutocompleteSessionToken: class {},
  });
  document.head.querySelectorAll("script").forEach((script) => script.remove());
});

describe("useGoogleMapsScript", () => {
  it("sem chave, explica como configurar e não carrega nada", async () => {
    const { useGoogleMapsScript } = await carregarHooks("");

    const { result } = renderHook(() => useGoogleMapsScript());

    expect(result.current).toEqual({ carregado: false, erro: expect.stringContaining("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY") });
    expect(document.head.querySelector("script")).toBeNull();
  });

  it("insere o script uma vez só e avisa quando ele termina de carregar", async () => {
    const { useGoogleMapsScript } = await carregarHooks("chave-teste");

    const primeiro = renderHook(() => useGoogleMapsScript());
    const segundo = renderHook(() => useGoogleMapsScript());
    const scripts = document.head.querySelectorAll("script");
    expect(scripts).toHaveLength(1);
    expect(scripts[0].src).toContain("key=chave-teste");

    scripts[0].dispatchEvent(new Event("load"));

    await waitFor(() => expect(primeiro.result.current.carregado).toBe(true));
    expect(segundo.result.current).toEqual({ carregado: true, erro: null });
  });

  it("devolve o erro quando o script não carrega", async () => {
    const { useGoogleMapsScript } = await carregarHooks("chave-teste");

    const { result } = renderHook(() => useGoogleMapsScript());
    document.head.querySelector("script")!.dispatchEvent(new Event("error"));

    await waitFor(() => expect(result.current.erro).toBe("Falha ao carregar o script do Google Maps."));
  });
});

describe("usePlacesAutocomplete", () => {
  beforeEach(() => vi.stubGlobal("google", { maps: { importLibrary } }));

  it("busca sugestões no Brasil depois de 3 letras e ignora predições vazias", async () => {
    fetchAutocompleteSuggestions.mockResolvedValue({
      suggestions: [
        { placePrediction: predicao("abc", "Cataratas do Iguaçu, Foz do Iguaçu - PR") },
        { placePrediction: predicao(undefined, "Sem ID") },
        {},
      ],
    });
    const { usePlacesAutocomplete } = await carregarHooks("chave-teste");

    const { result, rerender } = renderHook(({ texto }) => usePlacesAutocomplete(texto), { initialProps: { texto: "Ca" } });
    await new Promise((resolve) => setTimeout(resolve, 350));
    expect(fetchAutocompleteSuggestions).not.toHaveBeenCalled();

    rerender({ texto: "Cataratas" });

    await waitFor(() => expect(result.current.suggestions).toHaveLength(2));
    expect(result.current.suggestions.map(({ id, label }) => ({ id, label }))).toEqual([
      { id: "abc", label: "Cataratas do Iguaçu, Foz do Iguaçu - PR" },
      { id: "Sem ID", label: "Sem ID" },
    ]);
    expect(fetchAutocompleteSuggestions).toHaveBeenCalledWith(expect.objectContaining({ input: "Cataratas", includedRegionCodes: ["br"] }));
    expect(result.current.isSearching).toBe(false);
  });

  it("sem chave do Google não chama a API", async () => {
    const { usePlacesAutocomplete } = await carregarHooks("");

    const { result } = renderHook(() => usePlacesAutocomplete("Cataratas"));
    await new Promise((resolve) => setTimeout(resolve, 350));

    expect(importLibrary).not.toHaveBeenCalled();
    expect(result.current.suggestions).toEqual([]);
  });

  it("fica sem sugestões quando a API do Google falha", async () => {
    importLibrary.mockRejectedValue(new Error("cota excedida"));
    const { usePlacesAutocomplete } = await carregarHooks("chave-teste");

    const { result } = renderHook(() => usePlacesAutocomplete("Cataratas"));

    await waitFor(() => expect(importLibrary).toHaveBeenCalled());
    await waitFor(() => expect(result.current.isSearching).toBe(false));
    expect(result.current.suggestions).toEqual([]);
  });

  it("transforma a sugestão escolhida em um lugar com coordenadas", async () => {
    const { usePlacesAutocomplete } = await carregarHooks("chave-teste");
    const { result } = renderHook(() => usePlacesAutocomplete(""));

    const lugar = await result.current.resolveSuggestion({
      id: "abc",
      label: "Cataratas do Iguaçu, Foz do Iguaçu - PR",
      prediction: predicao("abc", "Cataratas", {
        displayName: { text: "Cataratas do Iguaçu" },
        formattedAddress: "BR-469, Foz do Iguaçu - PR",
        location: { lat: () => -25.69, lng: () => -54.43 },
      }) as never,
    });

    expect(lugar).toMatchObject({
      id: "google-abc",
      name: "Cataratas do Iguaçu",
      latitude: -25.69,
      longitude: -54.43,
      description: "BR-469, Foz do Iguaçu - PR",
    });
  });

  it("usa o endereço como nome quando falta o nome e recusa lugar sem coordenadas", async () => {
    const { usePlacesAutocomplete } = await carregarHooks("chave-teste");
    const { result } = renderHook(() => usePlacesAutocomplete(""));

    const semNome = await result.current.resolveSuggestion({
      id: "x",
      label: "rótulo",
      prediction: predicao("x", "x", { formattedAddress: "Rua A, 10", location: { lat: () => 1, lng: () => 2 } }) as never,
    });
    expect(semNome.name).toBe("Rua A, 10");

    await expect(result.current.resolveSuggestion({
      id: "y",
      label: "Sem coordenadas",
      prediction: predicao("y", "y", { displayName: "Lugar" }) as never,
    })).rejects.toThrow("Não foi possível obter as coordenadas");
  });
});

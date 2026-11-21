import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LocationField, { type LocationFieldValue } from "@/app/criar-roteiro/LocationField";
import { MOCK_PLACES, searchPlaces } from "@/app/criar-roteiro/mockPlaces";
import type { GooglePlaceSuggestion } from "@/hooks/usePlacesAutocomplete";

const autocomplete = vi.hoisted(() => ({
  suggestions: [] as GooglePlaceSuggestion[],
  isSearching: false,
  resolveSuggestion: vi.fn(),
}));
vi.mock("@/hooks/usePlacesAutocomplete", () => ({ usePlacesAutocomplete: () => autocomplete }));

const mudancas: LocationFieldValue[] = [];

function Campo({ inicial = { text: "", place: null } }: { inicial?: LocationFieldValue }) {
  const [valor, setValor] = useState<LocationFieldValue>(inicial);
  return (
    <LocationField
      id="origem"
      label="Origem"
      placeholder="Onde você está agora?"
      value={valor}
      onChange={(novo) => {
        mudancas.push(novo);
        setValor(novo);
      }}
      errorMessage="Informe a origem"
    />
  );
}

beforeEach(() => {
  mudancas.length = 0;
  autocomplete.suggestions = [];
  autocomplete.isSearching = false;
  autocomplete.resolveSuggestion.mockReset();
});

describe("searchPlaces", () => {
  it("sugere os seis primeiros lugares sem texto e filtra pelo nome sem diferenciar maiúsculas", () => {
    expect(searchPlaces("  ")).toEqual(MOCK_PLACES.slice(0, 6));
    expect(searchPlaces("AEROPORTO").map((place) => place.id)).toEqual(["aeroporto-foz"]);
    expect(searchPlaces("lugar que não existe")).toEqual([]);
  });
});

describe("LocationField", () => {
  it("sem Google, usa as sugestões locais e confirma o lugar escolhido", () => {
    render(<Campo />);
    const campo = screen.getByRole("combobox", { name: "Origem" });

    fireEvent.focus(campo);
    fireEvent.change(campo, { target: { value: "Aeroporto" } });
    expect(campo.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Aeroporto Internacional de Foz do Iguaçu - PR" }));

    expect(mudancas.at(-1)?.place?.id).toBe("aeroporto-foz");
    expect((campo as HTMLInputElement).value).toBe("Aeroporto Internacional de Foz do Iguaçu - PR");
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(campo.getAttribute("aria-invalid")).toBe("false");
  });

  it("mostra o erro ao sair do campo sem escolher uma sugestão", () => {
    vi.useFakeTimers();
    render(<Campo />);
    const campo = screen.getByRole("combobox", { name: "Origem" });

    fireEvent.focus(campo);
    fireEvent.change(campo, { target: { value: "Rua qualquer" } });
    fireEvent.blur(campo);
    act(() => vi.advanceTimersByTime(150));
    vi.useRealTimers();

    expect(screen.getByText("Informe a origem")).toBeTruthy();
    expect(campo.getAttribute("aria-invalid")).toBe("true");
    expect(mudancas.at(-1)).toEqual({ text: "Rua qualquer", place: null });
  });

  it("editar um lugar já escolhido invalida a escolha", () => {
    render(<Campo inicial={{ text: MOCK_PLACES[0].name, place: MOCK_PLACES[0] }} />);

    fireEvent.change(screen.getByRole("combobox", { name: "Origem" }), { target: { value: "Aeroporto In" } });

    expect(mudancas.at(-1)).toEqual({ text: "Aeroporto In", place: null });
  });

  it("com sugestões do Google, busca as coordenadas da escolhida", async () => {
    const lugar = { ...MOCK_PLACES[2], id: "google-abc", name: "Cataratas do Iguaçu" };
    autocomplete.suggestions = [{ id: "abc", label: "Cataratas do Iguaçu, Foz do Iguaçu - PR", prediction: {} as never }];
    autocomplete.resolveSuggestion.mockResolvedValue(lugar);
    render(<Campo />);

    fireEvent.focus(screen.getByRole("combobox", { name: "Origem" }));
    fireEvent.click(screen.getByRole("button", { name: "Cataratas do Iguaçu, Foz do Iguaçu - PR" }));

    await waitFor(() => expect(mudancas.at(-1)).toEqual({ text: "Cataratas do Iguaçu", place: lugar }));
    expect(screen.queryByRole("button", { name: "Aeroporto Internacional de Foz do Iguaçu - PR" })).toBeNull();
  });

  it("explica quando o Google não devolve as coordenadas", async () => {
    autocomplete.suggestions = [{ id: "abc", label: "Lugar sem coordenadas", prediction: {} as never }];
    autocomplete.resolveSuggestion.mockRejectedValue(new Error("Não foi possível obter as coordenadas desse local."));
    render(<Campo />);

    fireEvent.focus(screen.getByRole("combobox", { name: "Origem" }));
    fireEvent.click(screen.getByRole("button", { name: "Lugar sem coordenadas" }));

    expect((await screen.findByRole("alert")).textContent).toBe("Não foi possível obter as coordenadas desse local.");
    expect(mudancas).toEqual([]);
  });

  it("indica quando está buscando lugares", () => {
    autocomplete.isSearching = true;
    render(<Campo />);

    fireEvent.focus(screen.getByRole("combobox", { name: "Origem" }));

    expect(screen.getByText("Buscando lugares…")).toBeTruthy();
  });
});

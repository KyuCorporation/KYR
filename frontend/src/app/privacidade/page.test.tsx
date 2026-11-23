import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PrivacidadePage from "@/app/privacidade/page";

describe("política de privacidade", () => {
  it("descreve os dados guardados, o compartilhamento e onde exercer os direitos", () => {
    vi.stubEnv("NEXT_PUBLIC_CONTATO_PRIVACIDADE", "");
    render(<PrivacidadePage />);

    for (const dado of ["Nome e e-mail", "Senha", "Sessão", "Roteiros salvos", "Avaliações de destinos", "Endereço IP"]) {
      expect(screen.getByRole("cell", { name: dado })).toBeTruthy();
    }
    expect(screen.getByText(/Google Maps:/)).toBeTruthy();
    expect(screen.getByText(/Nenhum dado da sua conta é enviado/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Minha conta" }).getAttribute("href")).toBe("/conta");
    expect(screen.getByText(/fale com a equipe do projeto/)).toBeTruthy();
    expect(screen.queryByRole("link", { name: /@/ })).toBeNull();
  });

  it("mostra o e-mail de contato quando ele está configurado", () => {
    vi.stubEnv("NEXT_PUBLIC_CONTATO_PRIVACIDADE", "privacidade@kyr.exemplo");
    render(<PrivacidadePage />);

    expect(screen.getByRole("link", { name: "privacidade@kyr.exemplo" }).getAttribute("href")).toBe("mailto:privacidade@kyr.exemplo");
  });
});

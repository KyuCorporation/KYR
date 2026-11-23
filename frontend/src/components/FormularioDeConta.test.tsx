import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import FormularioDeConta from "@/components/FormularioDeConta";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

function respostaJson(status: number, corpo: unknown): Response {
  return new Response(JSON.stringify(corpo), { status, headers: { "content-type": "application/json" } });
}

// No cadastro, o rótulo da senha também contém o texto de ajuda "Pelo menos 8 caracteres.".
function preencher(rotulo: string, valor: string) {
  fireEvent.change(screen.getByLabelText(new RegExp(`^${rotulo}`)), { target: { value: valor } });
}

function enviar() {
  fireEvent.submit(screen.getByRole("button", { name: /Entrar|Criar conta/ }).closest("form")!);
}

beforeEach(() => push.mockReset());

describe("FormularioDeConta", () => {
  it("no cadastro, exige senha de 8 caracteres antes de chamar o servidor", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    render(<FormularioDeConta modo="cadastro" />);

    preencher("Nome", "Ana Viajante");
    preencher("E-mail", "ana@exemplo.com");
    preencher("Senha", "curta");
    enviar();

    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "A senha precisa ter pelo menos 8 caracteres.");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("cadastra com nome e e-mail sem espaços nas pontas e vai para o início", async () => {
    const fetch = vi.fn().mockResolvedValue(respostaJson(201, { usuario: { nome: "Ana Viajante", email: "ana@exemplo.com" } }));
    vi.stubGlobal("fetch", fetch);
    render(<FormularioDeConta modo="cadastro" />);

    preencher("Nome", "  Ana Viajante ");
    preencher("E-mail", " ana@exemplo.com ");
    preencher("Senha", "segredo-123");
    enviar();

    await waitFor(() => expect(push).toHaveBeenCalledWith("/inicio"));
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ nome: "Ana Viajante", email: "ana@exemplo.com", senha: "segredo-123" });
  });

  it("no login, não pede nome e mostra o erro do servidor", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(respostaJson(401, { mensagem: "E-mail ou senha incorretos." })));
    render(<FormularioDeConta modo="entrar" />);

    expect(screen.queryByLabelText("Nome")).toBeNull();
    expect(screen.getByRole("link", { name: "Criar conta" }).getAttribute("href")).toBe("/cadastro");

    preencher("E-mail", "ana@exemplo.com");
    preencher("Senha", "errada");
    enviar();

    expect((await screen.findByRole("alert")).textContent).toBe("E-mail ou senha incorretos.");
    expect(push).not.toHaveBeenCalled();
    expect((screen.getByRole("button", { name: "Entrar" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("no cadastro, informa quais dados são guardados e leva à política de privacidade", () => {
    const { unmount } = render(<FormularioDeConta modo="cadastro" />);

    expect(screen.getByText(/Guardamos seu nome, e-mail, roteiros salvos e avaliações/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "política de privacidade" }).getAttribute("href")).toBe("/privacidade");
    unmount();

    render(<FormularioDeConta modo="entrar" />);
    expect(screen.queryByRole("link", { name: "política de privacidade" })).toBeNull();
  });
});

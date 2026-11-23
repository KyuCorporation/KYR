import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ContaClient from "@/app/conta/ContaClient";

const ANA = { nome: "Ana Viajante", email: "ana@exemplo.com" };

function respostaJson(status: number, corpo: unknown): Response {
  return new Response(JSON.stringify(corpo), { status, headers: { "content-type": "application/json" } });
}

function entrarComoAna() {
  window.localStorage.setItem("kyr:sessao", JSON.stringify(ANA));
}

function prepararExclusao(senha: string) {
  fireEvent.change(screen.getByLabelText("Senha atual"), { target: { value: senha } });
  fireEvent.click(screen.getByLabelText("Entendo que a exclusão não pode ser desfeita."));
  fireEvent.click(screen.getByRole("button", { name: "Excluir minha conta" }));
}

beforeEach(() => vi.stubGlobal("caches", { delete: vi.fn().mockResolvedValue(true) }));

describe("tela Minha conta", () => {
  it("sem login, explica que nada fica no servidor e ainda permite apagar os dados do aparelho", async () => {
    window.localStorage.setItem("kyr:favoritos", '["parque-das-aves"]');
    render(<ContaClient />);

    expect(await screen.findByText("Você não está conectado")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Baixar meus dados" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Excluir minha conta" })).toBeNull();
    expect(screen.getByRole("link", { name: "política de privacidade" }).getAttribute("href")).toBe("/privacidade");

    fireEvent.click(screen.getByRole("button", { name: "Apagar dados deste dispositivo" }));
    fireEvent.click(screen.getByRole("button", { name: "Sim, apagar" }));

    expect(screen.getByText("Os dados do Kyr neste dispositivo foram apagados.")).toBeTruthy();
    expect(window.localStorage.getItem("kyr:favoritos")).toBeNull();
  });

  it("cancelar a limpeza do aparelho não apaga nada", async () => {
    window.localStorage.setItem("kyr:favoritos", '["parque-das-aves"]');
    render(<ContaClient />);

    fireEvent.click(await screen.findByRole("button", { name: "Apagar dados deste dispositivo" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(window.localStorage.getItem("kyr:favoritos")).toBe('["parque-das-aves"]');
  });

  it("baixa os dados da conta como arquivo JSON", async () => {
    entrarComoAna();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(respostaJson(200, { conta: ANA, roteirosSalvos: [] })));
    const criarUrl = vi.fn().mockReturnValue("blob:meus-dados");
    // O jsdom não implementa createObjectURL; a subclasse some com o unstubAllGlobals do setup.
    vi.stubGlobal("URL", class extends URL {
      static createObjectURL = criarUrl;
      static revokeObjectURL = vi.fn();
    });
    const clique = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    render(<ContaClient />);

    expect(await screen.findByText("ana@exemplo.com")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Baixar meus dados" }));

    expect(await screen.findByText("Arquivo meus-dados-kyr.json gerado.")).toBeTruthy();
    const arquivo = criarUrl.mock.calls[0][0] as Blob;
    const texto = await new Promise<string>((resolve) => {
      const leitor = new FileReader();
      leitor.onload = () => resolve(String(leitor.result));
      leitor.readAsText(arquivo);
    });
    expect(JSON.parse(texto)).toEqual({ conta: ANA, roteirosSalvos: [] });
    expect(clique).toHaveBeenCalledTimes(1);
  });

  it("corrige o nome e só habilita o botão quando o nome muda", async () => {
    entrarComoAna();
    const fetch = vi.fn().mockResolvedValue(respostaJson(200, { nome: "Ana Souza", email: ANA.email }));
    vi.stubGlobal("fetch", fetch);
    render(<ContaClient />);

    const salvar = await screen.findByRole("button", { name: "Salvar nome" });
    expect((salvar as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Ana Souza" } });
    fireEvent.click(salvar);

    expect(await screen.findByText("Nome atualizado.")).toBeTruthy();
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ nome: "Ana Souza" });
    expect(JSON.parse(window.localStorage.getItem("kyr:sessao") ?? "{}").nome).toBe("Ana Souza");
  });

  it("só permite excluir com a senha e a confirmação, e mostra a senha incorreta", async () => {
    entrarComoAna();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(respostaJson(403, { codigo: "senha_incorreta", mensagem: "Senha incorreta." })));
    render(<ContaClient />);

    const excluir = await screen.findByRole("button", { name: "Excluir minha conta" });
    expect((excluir as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Senha atual"), { target: { value: "errada" } });
    expect((excluir as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByLabelText("Entendo que a exclusão não pode ser desfeita."));
    fireEvent.click(excluir);

    expect((await screen.findByRole("alert")).textContent).toBe("Senha incorreta.");
    expect(JSON.parse(window.localStorage.getItem("kyr:sessao") ?? "null")).toEqual(ANA);
    expect((screen.getByLabelText("Senha atual") as HTMLInputElement).value).toBe("");
  });

  it("depois de excluir, confirma o que foi apagado e esquece a sessão", async () => {
    entrarComoAna();
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetch);
    render(<ContaClient />);

    await screen.findByRole("button", { name: "Excluir minha conta" });
    prepararExclusao("certa-123");

    expect(await screen.findByText("Conta excluída")).toBeTruthy();
    expect(screen.getByText(/Sua conta, suas sessões, seus roteiros salvos e suas avaliações foram apagados/)).toBeTruthy();
    expect(window.localStorage.getItem("kyr:sessao")).toBeNull();
    expect(fetch.mock.calls[0][0]).toBe("/api/auth/conta");
    expect(screen.queryByRole("button", { name: "Baixar meus dados" })).toBeNull();
  });

  it("com a sessão vencida, volta para o estado sem login", async () => {
    entrarComoAna();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(respostaJson(401, { codigo: "nao_autenticado", mensagem: "Entre na sua conta para continuar." })));
    render(<ContaClient />);

    fireEvent.click(await screen.findByRole("button", { name: "Baixar meus dados" }));

    await waitFor(() => expect(screen.getByText("Você não está conectado")).toBeTruthy());
    expect(window.localStorage.getItem("kyr:sessao")).toBeNull();
  });
});

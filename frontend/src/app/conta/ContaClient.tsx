"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import ExploreSidebar from "@/components/ExploreSidebar";
import { ApiError } from "@/core/api";
import {
  apagarDadosDoDispositivo,
  atualizarNome,
  buscarMeusDados,
  esquecerSessao,
  excluirConta,
  lerSessao,
  type Sessao,
} from "@/core/sessao";
import styles from "./conta.module.css";

// Direitos do titular (LGPD, art. 18) que a pessoa exerce sozinha: acesso e portabilidade (baixar os
// dados), correção do nome, eliminação da conta e limpeza do que ficou no navegador.

type Aviso = { tipo: "ok" | "erro"; texto: string } | null;

function mensagemDe(falha: unknown, padrao: string): string {
  return falha instanceof ApiError || falha instanceof Error ? falha.message : padrao;
}

function baixarComoArquivo(dados: unknown, nome: string) {
  const blob = new Blob([JSON.stringify(dados, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nome;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function ContaClient() {
  const [sessao, setSessao] = useState<Sessao | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [nome, setNome] = useState("");
  const [avisoDados, setAvisoDados] = useState<Aviso>(null);
  const [avisoDispositivo, setAvisoDispositivo] = useState<Aviso>(null);
  const [confirmandoDispositivo, setConfirmandoDispositivo] = useState(false);
  const [senha, setSenha] = useState("");
  const [ciente, setCiente] = useState(false);
  const [avisoExclusao, setAvisoExclusao] = useState<Aviso>(null);
  const [ocupado, setOcupado] = useState<"nome" | "baixar" | "excluir" | null>(null);
  const [excluida, setExcluida] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const atual = lerSessao();
      setSessao(atual);
      setNome(atual?.nome ?? "");
      setCarregando(false);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  // 401: a sessão venceu ou foi encerrada em outro lugar.
  function tratarSessaoVencida(falha: unknown): boolean {
    if (falha instanceof ApiError && falha.status === 401) {
      esquecerSessao();
      setSessao(null);
      return true;
    }
    return false;
  }

  async function salvarNome(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setOcupado("nome");
    setAvisoDados(null);
    try {
      const atualizada = await atualizarNome(nome.trim());
      setSessao(atualizada);
      setNome(atualizada.nome);
      setAvisoDados({ tipo: "ok", texto: "Nome atualizado." });
    } catch (falha) {
      if (!tratarSessaoVencida(falha)) setAvisoDados({ tipo: "erro", texto: mensagemDe(falha, "Não foi possível atualizar o nome.") });
    } finally {
      setOcupado(null);
    }
  }

  async function baixarDados() {
    setOcupado("baixar");
    setAvisoDados(null);
    try {
      baixarComoArquivo(await buscarMeusDados(), "meus-dados-kyr.json");
      setAvisoDados({ tipo: "ok", texto: "Arquivo meus-dados-kyr.json gerado." });
    } catch (falha) {
      if (!tratarSessaoVencida(falha)) setAvisoDados({ tipo: "erro", texto: mensagemDe(falha, "Não foi possível baixar os dados.") });
    } finally {
      setOcupado(null);
    }
  }

  function apagarDispositivo() {
    apagarDadosDoDispositivo();
    setConfirmandoDispositivo(false);
    setAvisoDispositivo({ tipo: "ok", texto: "Os dados do Kyr neste dispositivo foram apagados." });
  }

  async function excluir(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!ciente || !senha) return;
    setOcupado("excluir");
    setAvisoExclusao(null);
    try {
      await excluirConta(senha);
      setSessao(null);
      setExcluida(true);
    } catch (falha) {
      if (tratarSessaoVencida(falha)) return;
      setAvisoExclusao({ tipo: "erro", texto: mensagemDe(falha, "Não foi possível excluir a conta.") });
    } finally {
      setSenha("");
      setOcupado(null);
    }
  }

  const aviso = (dado: Aviso) =>
    dado && (
      <p className={dado.tipo === "ok" ? styles.ok : styles.erro} role={dado.tipo === "ok" ? "status" : "alert"}>
        {dado.texto}
      </p>
    );

  return (
    <div className={styles.shell}>
      <ExploreSidebar active="conta" />
      <main className={styles.main}>
        <header className={styles.header}>
          <h1>Minha conta</h1>
          <p>
            Veja, baixe, corrija ou apague os seus dados. Saiba o que o Kyr guarda na{" "}
            <Link href="/privacidade">política de privacidade</Link>.
          </p>
        </header>

        {carregando && <p role="status">Carregando…</p>}

        {!carregando && excluida && (
          <section className={styles.bloco}>
            <h2>Conta excluída</h2>
            <p role="status">
              Sua conta, suas sessões, seus roteiros salvos e suas avaliações foram apagados do servidor.
            </p>
            <Link href="/">Voltar ao início</Link>
          </section>
        )}

        {!carregando && !excluida && !sessao && (
          <section className={styles.bloco}>
            <h2>Você não está conectado</h2>
            <p>
              Sem conta, o Kyr não guarda dados seus no servidor: favoritos e roteiros ficam só neste dispositivo.{" "}
              <Link href="/entrar">Entre na sua conta</Link> para baixar, corrigir ou excluir os dados dela.
            </p>
          </section>
        )}

        {!carregando && sessao && (
          <section className={styles.bloco} aria-labelledby="titulo-dados">
            <h2 id="titulo-dados">Seus dados</h2>
            <p>E-mail: <strong>{sessao.email}</strong></p>
            <form className={styles.linha} onSubmit={(evento) => void salvarNome(evento)}>
              <label>
                Nome
                <input value={nome} onChange={(evento) => setNome(evento.target.value)} maxLength={120} required />
              </label>
              <button type="submit" disabled={ocupado !== null || !nome.trim() || nome.trim() === sessao.nome}>
                {ocupado === "nome" ? "Salvando…" : "Salvar nome"}
              </button>
            </form>
            <p className={styles.apoio}>
              Baixe, em JSON, tudo o que o servidor guarda sobre a sua conta: nome, e-mail, roteiros salvos, avaliações e
              sessões ativas.
            </p>
            <button type="button" className={styles.secundario} onClick={() => void baixarDados()} disabled={ocupado !== null}>
              {ocupado === "baixar" ? "Preparando…" : "Baixar meus dados"}
            </button>
            {aviso(avisoDados)}
          </section>
        )}

        {!carregando && (
          <section className={styles.bloco} aria-labelledby="titulo-dispositivo">
            <h2 id="titulo-dispositivo">Dados neste dispositivo</h2>
            <p className={styles.apoio}>
              Apaga os favoritos, os roteiros salvos neste navegador, o último roteiro gerado e as preferências. Não
              afeta a sua conta nem os roteiros salvos nela.
            </p>
            {confirmandoDispositivo ? (
              <div className={styles.confirmacao}>
                <span>Apagar os dados do Kyr neste dispositivo?</span>
                <button type="button" className={styles.perigo} onClick={apagarDispositivo}>Sim, apagar</button>
                <button type="button" className={styles.secundario} onClick={() => setConfirmandoDispositivo(false)}>Cancelar</button>
              </div>
            ) : (
              <button type="button" className={styles.secundario} onClick={() => { setAvisoDispositivo(null); setConfirmandoDispositivo(true); }}>
                Apagar dados deste dispositivo
              </button>
            )}
            {aviso(avisoDispositivo)}
          </section>
        )}

        {!carregando && sessao && (
          <section className={`${styles.bloco} ${styles.zonaDePerigo}`} aria-labelledby="titulo-excluir">
            <h2 id="titulo-excluir">Excluir conta</h2>
            <p className={styles.apoio}>
              Apaga, na hora e de forma definitiva, a sua conta, as sessões, os roteiros salvos nela e as suas
              avaliações. Os dados deste dispositivo continuam até você apagá-los acima.
            </p>
            <form className={styles.exclusao} onSubmit={(evento) => void excluir(evento)}>
              <label>
                Senha atual
                <input
                  type="password"
                  autoComplete="current-password"
                  value={senha}
                  onChange={(evento) => setSenha(evento.target.value)}
                  maxLength={72}
                />
              </label>
              <label className={styles.ciente}>
                <input type="checkbox" checked={ciente} onChange={(evento) => setCiente(evento.target.checked)} />
                Entendo que a exclusão não pode ser desfeita.
              </label>
              <button type="submit" className={styles.perigo} disabled={!ciente || !senha || ocupado !== null}>
                {ocupado === "excluir" ? "Excluindo…" : "Excluir minha conta"}
              </button>
            </form>
            {aviso(avisoExclusao)}
          </section>
        )}
      </main>
    </div>
  );
}

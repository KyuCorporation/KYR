"use client";

import Link from "next/link";
import { Star } from "@phosphor-icons/react/ssr";
import { useEffect, useState, type FormEvent } from "react";
import { ApiError, apiFetch } from "@/core/api";
import { esquecerSessao, lerSessao } from "@/core/sessao";
import styles from "./AvaliacoesDoDestino.module.css";

// Avaliações dos destinos do catálogo do Kyr, escritas por quem tem conta. Não são avaliações do Google.

interface Avaliacao {
  autor: string;
  nota: number;
  comentario: string;
  criadoEm: string;
}

interface Avaliacoes {
  media: number | null;
  total: number;
  avaliacoes: Avaliacao[];
}

function Estrelas({ nota }: { nota: number }) {
  return (
    <span className={styles.estrelas} aria-label={`${nota} de 5 estrelas`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={16} weight={n <= nota ? "fill" : "regular"} aria-hidden="true" />
      ))}
    </span>
  );
}

function formatarData(iso: string): string {
  const data = new Date(iso);
  return Number.isNaN(data.getTime()) ? "" : data.toLocaleDateString("pt-BR");
}

export default function AvaliacoesDoDestino({ slug }: { slug: string }) {
  const [dados, setDados] = useState<Avaliacoes | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [logado, setLogado] = useState(false);
  const [nota, setNota] = useState(0);
  const [comentario, setComentario] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    const frame = window.requestAnimationFrame(() => {
      setLogado(lerSessao() !== null);
      apiFetch<Avaliacoes>(`/api/destinos/${slug}/avaliacoes`)
        .then((resposta) => {
          if (ativo) setDados(resposta);
        })
        .catch(() => {
          if (ativo) setErro("Não foi possível carregar as avaliações agora.");
        });
    });
    return () => {
      ativo = false;
      window.cancelAnimationFrame(frame);
    };
  }, [slug]);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (nota < 1) {
      setAviso("Escolha uma nota de 1 a 5 estrelas.");
      return;
    }
    setEnviando(true);
    setAviso(null);
    try {
      const resposta = await apiFetch<Avaliacoes>(`/api/destinos/${slug}/avaliacoes`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nota, comentario }),
      });
      setDados(resposta);
      setComentario("");
      setAviso("Avaliação enviada. Obrigado!");
    } catch (falha) {
      if (falha instanceof ApiError && falha.status === 401) {
        esquecerSessao();
        setLogado(false);
        setAviso("Sua sessão terminou. Entre de novo para avaliar.");
      } else {
        setAviso(falha instanceof ApiError ? falha.message : "Não foi possível enviar a avaliação.");
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className={styles.bloco}>
      {erro && <p className={styles.vazio} role="alert">{erro}</p>}
      {!erro && dados === null && <p className={styles.vazio} role="status">Carregando avaliações…</p>}

      {dados && (
        <>
          <p className={styles.resumo}>
            {dados.total === 0 || dados.media === null
              ? "Este destino ainda não tem avaliações de viajantes do Kyr."
              : `${dados.media.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} de 5 · ${dados.total} ${dados.total === 1 ? "avaliação" : "avaliações"} de viajantes do Kyr`}
          </p>
          <ul className={styles.lista}>
            {dados.avaliacoes.map((avaliacao, indice) => (
              <li key={`${avaliacao.criadoEm}-${indice}`}>
                <div className={styles.cabecalho}>
                  <strong>{avaliacao.autor}</strong>
                  <Estrelas nota={avaliacao.nota} />
                  <span>{formatarData(avaliacao.criadoEm)}</span>
                </div>
                {avaliacao.comentario && <p>{avaliacao.comentario}</p>}
              </li>
            ))}
          </ul>
        </>
      )}

      {logado ? (
        <form className={styles.formulario} onSubmit={(evento) => void enviar(evento)}>
          <fieldset>
            <legend>Sua avaliação</legend>
            <div className={styles.escolha} role="radiogroup" aria-label="Nota">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  type="button"
                  key={n}
                  role="radio"
                  aria-checked={nota === n}
                  aria-label={`${n} ${n === 1 ? "estrela" : "estrelas"}`}
                  onClick={() => setNota(n)}
                >
                  <Star size={26} weight={n <= nota ? "fill" : "regular"} aria-hidden="true" />
                </button>
              ))}
            </div>
            <label htmlFor="comentario-avaliacao">Comentário (opcional)</label>
            <textarea
              id="comentario-avaliacao"
              rows={3}
              maxLength={600}
              value={comentario}
              onChange={(evento) => setComentario(evento.target.value)}
              placeholder="Conte como foi a visita."
            />
          </fieldset>
          <button type="submit" disabled={enviando}>{enviando ? "Enviando…" : "Enviar avaliação"}</button>
        </form>
      ) : (
        <p className={styles.convite}>
          <Link href="/entrar">Entre na sua conta</Link> para avaliar este destino.
        </p>
      )}
      {aviso && <p className={styles.aviso} role="status">{aviso}</p>}
    </div>
  );
}

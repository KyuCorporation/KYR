"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, BookmarkSimple, WarningCircle } from "@phosphor-icons/react/ssr";
import { useEffect, useState } from "react";
import RoteiroList from "@/components/RoteiroList";
import RoteiroMap from "@/components/RoteiroMap";
import { formatRouteTotal } from "@/core/routeMetrics";
import { salvarRoteiro } from "@/core/roteirosSalvos";
import type { RoteiroResponse } from "@/types/roteiro";
import styles from "./page.module.css";

export default function ResultadoRoteiroClient() {
  const [roteiro, setRoteiro] = useState<RoteiroResponse | null>(null);
  const [pontoSelecionadoId, setPontoSelecionadoId] = useState<string | null>(null);
  const [inicializando, setInicializando] = useState(true);
  const [erroMapa, setErroMapa] = useState<string | null>(null);
  const [roteiroSalvo, setRoteiroSalvo] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const saved = window.sessionStorage.getItem("kyr:last-roteiro");
        if (saved) setRoteiro(JSON.parse(saved) as RoteiroResponse);
      } catch {
        setRoteiro(null);
      } finally {
        setInicializando(false);
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  if (inicializando) {
    return <main className={styles.state} role="status">Abrindo seu roteiro…</main>;
  }

  if (!roteiro) {
    return (
      <main className={styles.state}>
        <p>Este roteiro não está disponível nesta sessão.</p>
        <Link className={styles.primaryAction} href="/criar-roteiro">
          Criar roteiro <ArrowRight size={17} aria-hidden="true" />
        </Link>
      </main>
    );
  }

  const fallback = roteiro.metadados.fonteRota === "fallback-sem-otimizacao";
  // Roteiros guardados antes do campo existir não têm curadoPorIa: só avisa quando vier false.
  const semCuradoria = roteiro.pontos.length > 0 && roteiro.metadados.curadoPorIa === false;
  const distance = formatRouteTotal(
    roteiro.pontos.map((ponto) => ponto.distanciaMetros),
    "distance",
  );
  const duration = formatRouteTotal(
    roteiro.pontos.map((ponto) => ponto.duracaoSegundos),
    "duration",
  );

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.backLink} href="/criar-roteiro">
          <ArrowLeft size={17} aria-hidden="true" /> Editar trajeto
        </Link>
        <div className={styles.headerActions}>
          <button
            className={styles.saveButton}
            type="button"
            disabled={roteiroSalvo}
            onClick={() => {
              salvarRoteiro(roteiro);
              setRoteiroSalvo(true);
            }}
          >
            <BookmarkSimple size={17} weight={roteiroSalvo ? "fill" : "regular"} aria-hidden="true" />
            {roteiroSalvo ? "Rota salva" : "Salvar rota"}
          </button>
          <Link className={styles.brand} href="/" aria-label="Kyr, início">kyr</Link>
        </div>
      </header>

      <section className={styles.intro}>
        <p className={styles.eyebrow}>Seu roteiro em Foz do Iguaçu</p>
        <h1>{roteiro.origem.nome} <span>→</span> {roteiro.destino.nome}</h1>
        <div className={styles.metrics}>
          <div><strong>{distance}</strong><span>Distância dos trechos</span></div>
          <div><strong>{duration}</strong><span>Tempo dos trechos</span></div>
          <div><strong>{roteiro.metadados.totalPontos}</strong><span>Pontos no roteiro</span></div>
        </div>
      </section>

      {fallback && (
        <div className={styles.fallbackNotice} role="status">
          <WarningCircle size={20} aria-hidden="true" />
          <span>O servidor não conseguiu otimizar a rota agora. Estes pontos usam a ordem de fallback.</span>
        </div>
      )}

      {semCuradoria && (
        <div className={styles.fallbackNotice} role="status">
          <WarningCircle size={20} aria-hidden="true" />
          <span>A curadoria por IA não está disponível agora. Os pontos aparecem sem descrição nem classificação.</span>
        </div>
      )}

      {erroMapa && <p className={styles.mapError} role="alert">{erroMapa}</p>}

      <section className={styles.results} aria-label="Pontos e mapa do roteiro">
        <div className={styles.listPanel}>
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}>Paradas sugeridas</p>
            <h2>Seu caminho</h2>
          </div>
          <RoteiroList
            data={roteiro}
            pontoSelecionadoId={pontoSelecionadoId}
            onSelecionarPonto={setPontoSelecionadoId}
          />
        </div>
        <div className={styles.mapPanel}>
          <RoteiroMap
            pontos={roteiro.pontos}
            rota={{ origem: roteiro.origem, destino: roteiro.destino }}
            pontoSelecionadoId={pontoSelecionadoId}
            onSelecionarPonto={setPontoSelecionadoId}
            onErroRota={setErroMapa}
            altura="h-full"
            semBorda
          />
        </div>
      </section>
    </main>
  );
}

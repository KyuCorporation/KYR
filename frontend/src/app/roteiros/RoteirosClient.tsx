"use client";

import Link from "next/link";
import { ArrowRight, MapPinLine, Plus, Trash } from "@phosphor-icons/react/ssr";
import { useEffect, useState } from "react";
import ExploreSidebar from "@/components/ExploreSidebar";
import { DESTINOS } from "@/core/destinos";
import { lerRoteirosSalvos, removerRoteiro, type RoteiroSalvo } from "@/core/roteirosSalvos";
import styles from "./roteiros.module.css";

const NOMES_DESTINOS = new Map(DESTINOS.map((destino) => [destino.slug, destino.nome]));

function formatarData(iso: string): string {
  const data = new Date(iso);
  return Number.isNaN(data.getTime()) ? "" : data.toLocaleDateString("pt-BR");
}

export default function RoteirosClient() {
  const [roteiros, setRoteiros] = useState<RoteiroSalvo[] | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setRoteiros(lerRoteirosSalvos()));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  function remover(id: string) {
    removerRoteiro(id);
    setRoteiros(lerRoteirosSalvos());
  }

  return (
    <div className={styles.shell}>
      <ExploreSidebar active="historico" />
      <main className={styles.main}>
        <header className={styles.header}>
          <div>
            <h1>Meus roteiros</h1>
            <p>Roteiros salvos neste dispositivo.</p>
          </div>
          <Link className={styles.newButton} href="/criar-roteiro">
            <Plus size={16} weight="bold" aria-hidden="true" /> Criar nova rota
          </Link>
        </header>

        {roteiros === null && <p className={styles.status} role="status">Carregando…</p>}

        {roteiros !== null && roteiros.length === 0 && (
          <section className={styles.empty}>
            <MapPinLine size={48} weight="light" aria-hidden="true" />
            <h2>Você ainda não salvou nenhum roteiro</h2>
            <p>Gere um roteiro e use &quot;Salvar rota&quot; para encontrá-lo aqui.</p>
            <Link className={styles.newButton} href="/criar-roteiro">
              Criar roteiro <ArrowRight size={15} weight="bold" aria-hidden="true" />
            </Link>
          </section>
        )}

        {roteiros !== null && roteiros.length > 0 && (
          <ul className={styles.list}>
            {roteiros.map((roteiro) => {
              const adicionados = roteiro.destinosAdicionados
                .map((slug) => NOMES_DESTINOS.get(slug))
                .filter((nome): nome is string => Boolean(nome));
              return (
                <li className={styles.card} key={roteiro.id}>
                  <div className={styles.cardInfo}>
                    <h2>{roteiro.origem.nome} <ArrowRight size={14} aria-hidden="true" /> {roteiro.destino.nome}</h2>
                    <p className={styles.meta}>
                      {roteiro.pontos.length} {roteiro.pontos.length === 1 ? "ponto" : "pontos"}
                      {formatarData(roteiro.criadoEm) && ` · salvo em ${formatarData(roteiro.criadoEm)}`}
                    </p>
                    {roteiro.pontos.length > 0 && <p className={styles.points}>{roteiro.pontos.join(" · ")}</p>}
                    {adicionados.length > 0 && (
                      <p className={styles.added}>Destinos adicionados: {adicionados.join(", ")}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    className={styles.remove}
                    onClick={() => remover(roteiro.id)}
                    aria-label={`Remover roteiro ${roteiro.origem.nome} para ${roteiro.destino.nome}`}
                  >
                    <Trash size={18} aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}

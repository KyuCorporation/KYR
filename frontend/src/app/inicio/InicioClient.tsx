"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Buildings, MagnifyingGlass, MaskHappy, Tree } from "@phosphor-icons/react/ssr";
import type { Icon } from "@phosphor-icons/react";
import { useState } from "react";
import ExploreSidebar from "@/components/ExploreSidebar";
import FavoriteButton from "@/components/FavoriteButton";
import { DESTINOS } from "@/core/destinos";
import styles from "./inicio.module.css";

const ICONES_CATEGORIA: Record<string, Icon> = {
  Natureza: Tree,
  Cultura: MaskHappy,
  Engenharia: Buildings,
};

const categorias = [...new Set(DESTINOS.map((destino) => destino.categoria))];

export default function InicioClient() {
  const router = useRouter();
  const [busca, setBusca] = useState("");

  function buscar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const termo = busca.trim();
    router.push(termo ? `/explorar?q=${encodeURIComponent(termo)}` : "/explorar");
  }

  return (
    <div className={styles.shell}>
      <ExploreSidebar active="inicio" />
      <main className={styles.main}>
        <header className={styles.greeting}>
          <h1>Olá viajante! <span aria-hidden="true">👋</span></h1>
          <p>Para onde você quer ir hoje?</p>
        </header>

        <form className={styles.search} role="search" onSubmit={buscar}>
          <MagnifyingGlass size={22} aria-hidden="true" />
          <label className={styles.visuallyHidden} htmlFor="busca-inicio">Buscar destinos</label>
          <input
            id="busca-inicio"
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar destinos, atrações ou atividades..."
          />
        </form>

        <section aria-labelledby="destaques-titulo">
          <div className={styles.sectionHeader}>
            <h2 id="destaques-titulo">Destinos em destaque</h2>
            <Link href="/explorar">Ver todos <ArrowRight size={15} weight="bold" aria-hidden="true" /></Link>
          </div>
          <div className={styles.featured}>
            {DESTINOS.map((destino) => (
              <article className={styles.card} key={destino.slug}>
                <Link href={`/destinos/${destino.slug}`} className={styles.cardLink}>
                  <div className={styles.imageWrap}>
                    <Image
                      src={destino.imagem}
                      alt={destino.imagemAlt}
                      fill
                      sizes="(max-width: 700px) 70vw, 240px"
                    />
                  </div>
                  <div className={styles.cardBody}>
                    <strong>{destino.nome}</strong>
                    <span>{destino.cidade}, {destino.estado}</span>
                  </div>
                </Link>
                <FavoriteButton slug={destino.slug} />
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="categorias-titulo">
          <div className={styles.sectionHeader}>
            <h2 id="categorias-titulo">Categorias</h2>
          </div>
          <div className={styles.categories}>
            {categorias.map((categoria) => {
              const Icone = ICONES_CATEGORIA[categoria] ?? Tree;
              return (
                <Link
                  className={styles.category}
                  href={`/explorar?categoria=${encodeURIComponent(categoria)}`}
                  key={categoria}
                >
                  <Icone size={44} weight="light" aria-hidden="true" />
                  <span>{categoria}</span>
                </Link>
              );
            })}
          </div>
        </section>

        <footer className={styles.attribution}>
          Fotos de destino: Wikimedia Commons, com crédito e licença em cada detalhe.
        </footer>
      </main>
    </div>
  );
}

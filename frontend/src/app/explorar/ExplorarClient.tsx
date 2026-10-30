"use client";

import Image from "next/image";
import Link from "next/link";
import { FunnelSimple, MagnifyingGlass, SlidersHorizontal } from "@phosphor-icons/react/ssr";
import { useEffect, useState } from "react";
import ExploreSidebar from "@/components/ExploreSidebar";
import FavoriteButton from "@/components/FavoriteButton";
import { lerFavoritos } from "@/core/favoritos";
import { DESTINOS } from "@/core/destinos";
import type { Destino } from "@/core/destinos";
import styles from "./explorar.module.css";

export default function ExplorarClient({ somenteFavoritos = false }: { somenteFavoritos?: boolean }) {
  const [query, setQuery] = useState("");
  const [categoria, setCategoria] = useState("Todas");
  const [tag, setTag] = useState("Todas");
  const [duracao, setDuracao] = useState("Qualquer duração");
  const [favoritos, setFavoritos] = useState<string[]>([]);
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setFavoritos(lerFavoritos());
      const params = new URLSearchParams(window.location.search);
      const q = params.get("q");
      const cat = params.get("categoria");
      if (q) setQuery(q);
      if (cat && DESTINOS.some((destino) => destino.categoria === cat)) setCategoria(cat);
    });
    const sync = () => setFavoritos(lerFavoritos());
    window.addEventListener("storage", sync);
    window.addEventListener("kyr:favoritos", sync);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("storage", sync);
      window.removeEventListener("kyr:favoritos", sync);
    };
  }, []);

  const categorias = [...new Set(DESTINOS.map((destino) => destino.categoria))];
  const tags = [...new Set(DESTINOS.flatMap((destino) => destino.tags))];
  const destinos = DESTINOS.filter((destino) => {
    if (somenteFavoritos && !favoritos.includes(destino.slug)) return false;
    if (categoria !== "Todas" && destino.categoria !== categoria) return false;
    if (tag !== "Todas" && !destino.tags.includes(tag)) return false;
    if (duracao === "Até 1 hora" && !destino.tempoVisita.includes("1 hora")) return false;
    if (duracao === "Mais de 1 hora" && !destino.tempoVisita.includes("2 horas") && !destino.tempoVisita.includes("Varia")) return false;
    const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
    if (normalizedQuery && !`${destino.nome} ${destino.categoria} ${destino.tags.join(" ")}`.toLocaleLowerCase("pt-BR").includes(normalizedQuery)) return false;
    return true;
  });

  function resetarFiltros() {
    setQuery("");
    setCategoria("Todas");
    setTag("Todas");
    setDuracao("Qualquer duração");
  }

  return (
    <div className={styles.shell}>
      <ExploreSidebar active={somenteFavoritos ? "favoritos" : "explorar"} />
      <main className={styles.main}>
        <header className={styles.topbar}>
          <div>
            <p className={styles.kicker}>Foz do Iguaçu · Paraná</p>
            <h1>{somenteFavoritos ? "Seus favoritos" : "Explore destinos"}</h1>
          </div>
          <button
            className={styles.moreFilters}
            type="button"
            aria-expanded={filtrosAbertos}
            onClick={() => setFiltrosAbertos((open) => !open)}
          >
            <SlidersHorizontal size={19} aria-hidden="true" />
            Filtros
          </button>
        </header>

        <label className={styles.search}>
          <MagnifyingGlass size={22} aria-hidden="true" />
          <span className={styles.visuallyHidden}>Buscar destinos</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar destinos, atrações ou atividades..."
          />
        </label>

        <section className={`${styles.filters} ${filtrosAbertos ? styles.filtersOpen : ""}`} aria-label="Filtros de destinos">
          <label className={styles.filterField}>
            <span>Cidade</span>
            <select defaultValue="Foz do Iguaçu" aria-label="Cidade">
              <option>Foz do Iguaçu</option>
            </select>
          </label>
          <label className={styles.filterField}>
            <span>Categorias</span>
            <select value={categoria} onChange={(event) => setCategoria(event.target.value)} aria-label="Categorias">
              <option>Todas</option>
              {categorias.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label className={styles.filterField}>
            <span>Experiência</span>
            <select value={tag} onChange={(event) => setTag(event.target.value)} aria-label="Experiência">
              <option>Todas</option>
              {tags.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label className={styles.filterField}>
            <span>Duração</span>
            <select value={duracao} onChange={(event) => setDuracao(event.target.value)} aria-label="Duração da visita">
              <option>Qualquer duração</option>
              <option>Até 1 hora</option>
              <option>Mais de 1 hora</option>
            </select>
          </label>
          <button className={styles.resetFilters} type="button" onClick={resetarFiltros}>
            <FunnelSimple size={16} aria-hidden="true" /> Limpar
          </button>
        </section>

        <div className={styles.sectionTitle}>
          <div>
            <p className={styles.kicker}>{somenteFavoritos ? "Sua coleção" : "Descubra pelo caminho"}</p>
            <h2>{somenteFavoritos ? "Destinos salvos" : "Destinos em destaque"}</h2>
          </div>
          <span className={styles.count}>{destinos.length} destinos</span>
        </div>

        {destinos.length > 0 ? (
          <div className={styles.grid}>
            {destinos.map((destino) => <DestinoCard destino={destino} key={destino.slug} />)}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <p>{somenteFavoritos ? "Você ainda não salvou destinos." : "Nenhum destino encontrado com esses filtros."}</p>
            {somenteFavoritos ? (
              <Link href="/explorar">Explorar destinos</Link>
            ) : (
              <button type="button" onClick={resetarFiltros}>Limpar filtros</button>
            )}
          </div>
        )}

        <footer className={styles.attribution}>
          Fotos de destino: Wikimedia Commons, com crédito e licença em cada detalhe.
        </footer>
      </main>
    </div>
  );
}

function DestinoCard({ destino }: { destino: Destino }) {
  return (
    <article className={styles.card}>
      <Link className={styles.cardLink} href={`/destinos/${destino.slug}`}>
        <div className={styles.imageWrap}>
          <Image src={destino.imagem} alt={destino.imagemAlt} fill sizes="(max-width: 700px) 100vw, (max-width: 1100px) 45vw, 30vw" />
        </div>
        <div className={styles.cardBody}>
          <span className={styles.cardCategory}>{destino.categoria}</span>
          <h3>{destino.nome}</h3>
          <p>{destino.cidade}, {destino.estado}</p>
        </div>
      </Link>
      <FavoriteButton slug={destino.slug} />
    </article>
  );
}
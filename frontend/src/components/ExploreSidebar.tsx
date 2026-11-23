"use client";

import Link from "next/link";
import {
  Backpack,
  CaretDoubleLeft,
  CaretDoubleRight,
  ClockCounterClockwise,
  Compass,
  Heart,
  House,
  MapPin,
  MapTrifold,
  Question,
} from "@phosphor-icons/react/ssr";
import { useEffect, useState } from "react";
import { lerSessao, sair, type Sessao } from "@/core/sessao";
import styles from "./ExploreSidebar.module.css";

type Props = { active: "explorar" | "favoritos" | "inicio" | "historico" | "ajuda" | "conta" | "privacidade" };

const NAV_ITEMS = [
  { href: "/inicio", label: "Início", icon: House, key: "inicio" },
  { href: "/explorar", label: "Explorar", icon: Compass, key: "explorar" },
  { href: "/favoritos", label: "Favoritos", icon: Heart, key: "favoritos" },
  { href: "/criar-roteiro", label: "Criar roteiro", icon: MapTrifold, key: "roteiro" },
  { href: "/roteiros", label: "Meus roteiros", icon: ClockCounterClockwise, key: "historico" },
  { href: "/ajuda", label: "Ajuda", icon: Question, key: "ajuda" },
];

const CHAVE_PREFERENCIA = "kyr:sidebar-expandida";

export default function ExploreSidebar({ active }: Props) {
  // Começa recolhida (igual ao HTML gerado no servidor) e aplica a preferência salva depois de montar.
  const [expandida, setExpandida] = useState(false);
  const [sessao, setSessao] = useState<Sessao | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        setExpandida(window.localStorage.getItem(CHAVE_PREFERENCIA) === "1");
      } catch {
        // Sem acesso ao localStorage: fica recolhida.
      }
      setSessao(lerSessao());
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  function alternar() {
    setExpandida((atual) => {
      const proxima = !atual;
      try {
        window.localStorage.setItem(CHAVE_PREFERENCIA, proxima ? "1" : "0");
      } catch {
        // A preferência só deixa de ser lembrada.
      }
      return proxima;
    });
  }

  function encerrarSessao() {
    sair();
    setSessao(null);
  }

  return (
    <aside className={`${styles.sidebar} ${expandida ? styles.expandida : ""}`}>
      <div className={styles.topo}>
        <Link className={styles.logo} href="/" aria-label="Kyr, página inicial">
          <MapPin size={24} weight="bold" aria-hidden="true" />
        </Link>
        {expandida && <span className={styles.marca}>kyr</span>}
      </div>

      <button
        type="button"
        className={styles.alternar}
        onClick={alternar}
        aria-expanded={expandida}
        aria-label={expandida ? "Recolher menu" : "Expandir menu"}
        title={expandida ? "Recolher menu" : "Expandir menu"}
      >
        {expandida ? <CaretDoubleLeft size={18} aria-hidden="true" /> : <CaretDoubleRight size={18} aria-hidden="true" />}
        {expandida && <span>Recolher</span>}
      </button>

      <nav className={styles.navigation} aria-label="Menu principal">
        {NAV_ITEMS.map(({ href, label, icon: Icon, key }) => (
          <Link
            aria-label={label}
            aria-current={active === key ? "page" : undefined}
            className={`${styles.navLink} ${active === key ? styles.active : ""}`}
            href={href}
            key={key}
            title={expandida ? undefined : label}
          >
            <Icon size={22} weight={active === key ? "fill" : "regular"} aria-hidden="true" />
            {expandida && <span>{label}</span>}
          </Link>
        ))}
      </nav>

      {expandida ? (
        <div className={styles.accountPrompt}>
          {sessao ? (
            <>
              <strong>Olá, {sessao.nome.split(" ")[0]}</strong>
              <span>Seus roteiros salvos ficam na sua conta.</span>
              <Link className={styles.primario} href="/conta">Minha conta</Link>
              <button type="button" className={styles.secundario} onClick={encerrarSessao}>Sair</button>
            </>
          ) : (
            <>
              <Backpack size={34} weight="light" aria-hidden="true" />
              <strong>Salve suas rotas</strong>
              <span>Sem conta, favoritos e roteiros ficam só neste dispositivo.</span>
              <Link className={styles.primario} href="/entrar">Entrar</Link>
              <Link className={styles.secundario} href="/cadastro">Criar conta</Link>
            </>
          )}
        </div>
      ) : (
        <Link
          className={styles.contaRecolhida}
          href={sessao ? "/conta" : "/entrar"}
          aria-label={sessao ? `Conta de ${sessao.nome}` : "Entrar"}
          title={sessao ? sessao.nome : "Entrar"}
        >
          <Backpack size={22} aria-hidden="true" />
        </Link>
      )}
    </aside>
  );
}

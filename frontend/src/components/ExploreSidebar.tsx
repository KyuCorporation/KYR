"use client";

import Link from "next/link";
import { Backpack, Compass, Heart, House, MapTrifold, MapPin, ClockCounterClockwise } from "@phosphor-icons/react/ssr";
import styles from "./ExploreSidebar.module.css";

type Props = { active: "explorar" | "favoritos" | "inicio" | "historico" };

const NAV_ITEMS = [
  { href: "/inicio", label: "Início", icon: House, key: "inicio" },
  { href: "/explorar", label: "Explorar", icon: Compass, key: "explorar" },
  { href: "/favoritos", label: "Favoritos", icon: Heart, key: "favoritos" },
  { href: "/criar-roteiro", label: "Criar roteiro", icon: MapTrifold, key: "roteiro" },
  { href: "/roteiros", label: "Meus roteiros", icon: ClockCounterClockwise, key: "historico" },
];

export default function ExploreSidebar({ active }: Props) {
  return (
    <aside className={styles.sidebar}>
      <Link className={styles.logo} href="/" aria-label="Kyr, início">
        <MapPin size={24} weight="bold" aria-hidden="true" />
      </Link>
      <nav className={styles.navigation} aria-label="Menu principal">
        {NAV_ITEMS.map(({ href, label, icon: Icon, key }) => (
          <Link
            aria-label={label}
            aria-current={active === key ? "page" : undefined}
            className={`${styles.navLink} ${active === key ? styles.active : ""}`}
            href={href}
            key={key}
            title={label}
          >
            <Icon size={22} weight={active === key ? "fill" : "regular"} aria-hidden="true" />
          </Link>
        ))}
      </nav>
      <div className={styles.accountPrompt}>
        <Backpack size={38} weight="light" aria-hidden="true" />
        <strong>Salve suas rotas</strong>
        <span>Seus favoritos ficam salvos neste dispositivo.</span>
        <button type="button" disabled title="Login ainda não disponível">Entrar</button>
        <button type="button" disabled title="Cadastro ainda não disponível">Criar conta</button>
      </div>
    </aside>
  );
}
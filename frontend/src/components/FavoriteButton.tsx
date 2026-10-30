"use client";

import { Heart } from "@phosphor-icons/react/ssr";
import { useEffect, useState } from "react";
import { alternarFavorito, lerFavoritos } from "@/core/favoritos";
import styles from "./FavoriteButton.module.css";

export default function FavoriteButton({ slug }: { slug: string }) {
  const [favorito, setFavorito] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setFavorito(lerFavoritos().includes(slug));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [slug]);

  function toggle(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    setFavorito(alternarFavorito(slug).includes(slug));
  }

  return (
    <button
      aria-label={favorito ? "Remover dos favoritos" : "Adicionar aos favoritos"}
      aria-pressed={favorito}
      className={`${styles.button} ${favorito ? styles.selected : ""}`}
      onClick={toggle}
      type="button"
    >
      <Heart size={20} weight={favorito ? "fill" : "regular"} aria-hidden="true" />
    </button>
  );
}
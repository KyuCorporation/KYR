"use client";

import { useState } from "react";
import styles from "./page.module.css";
import { gerarRoteiro } from "@/core/gerarRoteiro";

export default function Cenario() {
  const [origem, setOrigem] = useState("Aeroporto de Foz");
  const [destino, setDestino] = useState("Paraguai");
  const [carregando, setCarregando] = useState(false);

  async function handleGerarRoteiro() {
    setCarregando(true);

    // TODO: gerarRoteiro hoje é um stub, ajustar quando o
    // caminho real do backend-core (US-05) estiver definido.
    await gerarRoteiro({ origem, destino });

    setTimeout(() => {
      window.location.reload();
    }, 5000);
  }

  return (
    <div className={styles.container}>
      <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
        <div className={styles.campo}>
          <label htmlFor="origem">Origem</label>
          <input
            id="origem"
            type="text"
            value={origem}
            onChange={(e) => setOrigem(e.target.value)}
          />
        </div>

        <div className={styles.campo}>
          <label htmlFor="destino">Destino</label>
          <input
            id="destino"
            type="text"
            value={destino}
            onChange={(e) => setDestino(e.target.value)}
          />
        </div>

        <button
          type="button"
          className={`${styles.botao} ${carregando ? styles.botaoCarregando : ""}`}
          onClick={handleGerarRoteiro}
          disabled={carregando}
        >
          {carregando ? "Gerando roteiro" : "Gerar roteiro"}
        </button>
      </form>
    </div>
  );
}
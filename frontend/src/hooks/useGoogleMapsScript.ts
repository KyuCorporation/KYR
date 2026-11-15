"use client";

import { useEffect, useState } from "react";

// Carrega o script do Google Maps JS SDK dinamicamente, apenas uma vez,
// mesmo que este hook seja usado em vários componentes ao mesmo tempo.
// A chave vem de NEXT_PUBLIC_GOOGLE_MAPS_API_KEY (precisa desse prefixo
// para ficar disponível no navegador — variáveis sem NEXT_PUBLIC_ só
// existem no servidor).

type JanelaComGoogleMaps = typeof window & {
  google?: typeof google;
};

let promessaDoScript: Promise<void> | null = null;

function carregarScriptGoogleMaps(apiKey: string): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps só pode ser carregado no navegador."));
  }

  const janela = window as JanelaComGoogleMaps;

  if (janela.google?.maps) {
    return Promise.resolve();
  }

  if (promessaDoScript) {
    return promessaDoScript;
  }

  promessaDoScript = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    // Sem "loading=async": nesse modo clássico, assim que o script termina
    // de carregar, google.maps.Map / Marker / InfoWindow já ficam prontos
    // pra usar direto, sem precisar de importLibrary().
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Falha ao carregar o script do Google Maps."));
    document.head.appendChild(script);
  });

  return promessaDoScript;
}

interface UseGoogleMapsScriptResultado {
  carregado: boolean;
  erro: string | null;
}

// A chave é lida direto do process.env (inlined em build-time pelo Next),
// então dá pra saber se ela falta já durante o render, sem precisar de
// efeito — evita um setState síncrono dentro do useEffect (cascading render).
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const ERRO_SEM_API_KEY =
  "Chave do Google Maps não configurada. Defina NEXT_PUBLIC_GOOGLE_MAPS_API_KEY em frontend/.env.local.";

export function useGoogleMapsScript(): UseGoogleMapsScriptResultado {
  const [carregado, setCarregado] = useState(false);
  const [erroCarregamento, setErroCarregamento] = useState<string | null>(null);

  useEffect(() => {
    if (!API_KEY) return;

    let ativo = true;

    carregarScriptGoogleMaps(API_KEY)
      .then(() => {
        if (ativo) setCarregado(true);
      })
      .catch((e: Error) => {
        if (ativo) setErroCarregamento(e.message);
      });

    return () => {
      ativo = false;
    };
  }, []);

  return { carregado, erro: API_KEY ? erroCarregamento : ERRO_SEM_API_KEY };
}
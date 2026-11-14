"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Clock, Compass, MapPin, ShareNetwork, Sun, X } from "@phosphor-icons/react/ssr";
import { useRouter } from "next/navigation";
import { useState } from "react";
import FavoriteButton from "@/components/FavoriteButton";
import type { Destino } from "@/core/destinos";
import AvaliacoesDoDestino from "@/components/AvaliacoesDoDestino";
import { adicionarDestinoAoRoteiro, lerRoteirosDoDispositivo, type RoteiroSalvo } from "@/core/roteirosSalvos";
import styles from "./destino.module.css";

type Aba = "Sobre" | "Avaliações" | "Fatos" | "Dicas";

export default function DestinoDetalheClient({ destino }: { destino: Destino }) {
  const router = useRouter();
  const [aba, setAba] = useState<Aba>("Sobre");
  const [modalAberto, setModalAberto] = useState(false);
  const [roteiros, setRoteiros] = useState<RoteiroSalvo[]>([]);
  const [confirmacao, setConfirmacao] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);

  async function compartilhar() {
    setShareError(null);
    try {
      if (navigator.share) {
        await navigator.share({ title: destino.nome, url: window.location.href });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setShareError("Link copiado.");
      }
    } catch {
      setShareError("Não foi possível compartilhar agora.");
    }
  }

  function adicionarAoRoteiro(roteiroId: string, roteiroTitle: string) {
    adicionarDestinoAoRoteiro(roteiroId, destino.slug);
    setConfirmacao(`Adicionado a ${roteiroTitle}.`);
    setRoteiros(lerRoteirosDoDispositivo());
  }

  function criarRoteiroComDestino() {
    const pendingPlace = {
      id: destino.slug,
      name: `${destino.nome} - PR`,
      latitude: destino.coordenadas.latitude,
      longitude: destino.coordenadas.longitude,
      description: destino.resumo,
      categories: [destino.categoria, destino.tags[0] ?? "Turismo"] as [string, string],
      tempoMin: 0,
      distanciaKm: 0,
    };
    window.sessionStorage.setItem("kyr:pending-destination", JSON.stringify(pendingPlace));
    router.push("/criar-roteiro");
  }

  return (
    <main className={styles.page}>
      <section className={styles.hero} aria-label={`Foto de ${destino.nome}`}>
        <Image src={destino.imagem} alt={destino.imagemAlt} fill priority sizes="100vw" className={styles.heroImage} />
        <div className={styles.heroShade} />
        <Link className={styles.backButton} href="/explorar" aria-label="Voltar para explorar">
          <ArrowLeft size={20} aria-hidden="true" />
        </Link>
        <div className={styles.heroActions}>
          <button type="button" className={styles.iconButton} onClick={() => void compartilhar()} aria-label="Compartilhar destino">
            <ShareNetwork size={20} aria-hidden="true" />
          </button>
          <FavoriteButton slug={destino.slug} />
        </div>
      </section>

      <article className={styles.content}>
        <header className={styles.destinationHeader}>
          <p className={styles.city}>{destino.estado}</p>
          <h1>{destino.nome}, {destino.cidade}</h1>
          <p className={styles.category}>{destino.categoria}</p>
          <div className={styles.tags}>
            {destino.tags.map((tag) => <span key={tag}>{tag}</span>)}
          </div>
          <div className={styles.facts}>
            <div><Clock size={20} aria-hidden="true" /><span><strong>Tempo médio</strong>{destino.tempoVisita}</span></div>
            <div><Sun size={20} aria-hidden="true" /><span><strong>Melhor época</strong>{destino.melhorEpoca}</span></div>
            <div><Compass size={20} aria-hidden="true" /><span><strong>Experiência</strong>{destino.tags.join(" · ")}</span></div>
          </div>
        </header>

        <nav className={styles.tabs} aria-label="Informações do destino">
          {(["Sobre", "Avaliações", "Fatos", "Dicas"] as const).map((item) => (
            <button
              type="button"
              key={item}
              className={aba === item ? styles.activeTab : ""}
              aria-current={aba === item ? "page" : undefined}
              onClick={() => setAba(item)}
            >
              {item}
            </button>
          ))}
        </nav>

        <section className={styles.tabContent} aria-live="polite">
          {aba === "Sobre" && <p>{destino.descricao}</p>}
          {aba === "Avaliações" && <AvaliacoesDoDestino slug={destino.slug} />}
          {aba === "Fatos" && (
            <dl className={styles.factList}>
              <div><dt>Endereço</dt><dd>{destino.endereco}</dd></div>
              <div><dt>Categoria</dt><dd>{destino.categoria}</dd></div>
              <div><dt>Tempo médio de visita</dt><dd>{destino.tempoVisita}</dd></div>
              <div><dt>Melhor época</dt><dd>{destino.melhorEpoca}</dd></div>
            </dl>
          )}
          {aba === "Dicas" && (
            <ul className={styles.tips}>
              <li>Reserve {destino.tempoVisita} para a visita.</li>
              <li>Melhor época indicada: {destino.melhorEpoca.toLocaleLowerCase("pt-BR")}.</li>
              <li>Confirme horários e condições do passeio antes de sair.</li>
            </ul>
          )}
          <p className={styles.creditLine}>
            Foto: {destino.credito}. <a href={destino.creditoUrl} target="_blank" rel="noreferrer">Fonte</a> · <a href={destino.licencaUrl} target="_blank" rel="noreferrer">{destino.licenca}</a>
          </p>
          {shareError && <p className={styles.inlineStatus} role="status">{shareError}</p>}
        </section>

        <button className={styles.addRouteButton} type="button" onClick={() => {
          setRoteiros(lerRoteirosDoDispositivo());
          setConfirmacao(null);
          setModalAberto(true);
        }}>
          <span className={styles.addIcon}>+</span> Adicionar à rota
        </button>
      </article>

      {modalAberto && (
        <div className={styles.modalBackdrop} role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setModalAberto(false);
        }}>
          <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <button className={styles.closeModal} type="button" onClick={() => setModalAberto(false)} aria-label="Fechar">
              <X size={21} aria-hidden="true" />
            </button>
            <h2 id="modal-title">Adicionar à rota</h2>
            <p>Escolha uma opção</p>
            <div className={styles.savedRoutes}>
              {roteiros.map((roteiro) => {
                const title = `${roteiro.origem.nome} → ${roteiro.destino.nome}`;
                return (
                  <button
                    type="button"
                    className={styles.savedRoute}
                    key={roteiro.id}
                    onClick={() => adicionarAoRoteiro(roteiro.id, title)}
                  >
                    <span className={styles.routeThumbnail}><MapPin size={22} aria-hidden="true" /></span>
                    <span><strong>{title}</strong><small>{roteiro.totalPontos} pontos · salvo neste dispositivo</small></span>
                    <ArrowRight size={18} aria-hidden="true" />
                  </button>
                );
              })}
              {roteiros.length === 0 && (
                <p className={styles.emptyRoutes}>Nenhuma rota salva neste dispositivo. Crie uma nova rota já com este destino.</p>
              )}
            </div>
            {confirmacao && <p className={styles.modalStatus} role="status">{confirmacao}</p>}
            <button className={styles.newRouteButton} type="button" onClick={criarRoteiroComDestino}>
              <span>+</span> Criar nova rota
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
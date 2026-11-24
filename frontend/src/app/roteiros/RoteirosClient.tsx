"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, MapPinLine, Plus, Trash } from "@phosphor-icons/react/ssr";
import { useEffect, useState } from "react";
import ExploreSidebar from "@/components/ExploreSidebar";
import { ApiError } from "@/core/api";
import { DESTINOS } from "@/core/destinos";
import { gerarRoteiro } from "@/core/gerarRoteiro";
import {
  DIAS_DE_VALIDADE_DAS_COORDENADAS,
  listarRoteirosSalvos,
  paraReabrir,
  removerRoteiro,
  type RoteiroSalvo,
} from "@/core/roteirosSalvos";
import { lerSessao } from "@/core/sessao";
import styles from "./roteiros.module.css";

const NOMES_DESTINOS = new Map(DESTINOS.map((destino) => [destino.slug, destino.nome]));

function formatarData(iso: string): string {
  const data = new Date(iso);
  return Number.isNaN(data.getTime()) ? "" : data.toLocaleDateString("pt-BR");
}

function mensagemDe(erro: unknown, padrao: string): string {
  return erro instanceof ApiError ? erro.message : padrao;
}

export default function RoteirosClient() {
  const router = useRouter();
  const [roteiros, setRoteiros] = useState<RoteiroSalvo[] | null>(null);
  const [logado, setLogado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [abrindoId, setAbrindoId] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    const frame = window.requestAnimationFrame(() => {
      setLogado(lerSessao() !== null);
      listarRoteirosSalvos()
        .then((lista) => {
          if (ativo) setRoteiros(lista);
        })
        .catch((falha: unknown) => {
          if (!ativo) return;
          setRoteiros([]);
          setErro(mensagemDe(falha, "Não foi possível carregar os roteiros salvos."));
        });
    });
    return () => {
      ativo = false;
      window.cancelAnimationFrame(frame);
    };
  }, []);

  async function remover(roteiro: RoteiroSalvo) {
    setErro(null);
    try {
      await removerRoteiro(roteiro);
      setRoteiros((atuais) => atuais?.filter((item) => !(item.id === roteiro.id && item.onde === roteiro.onde)) ?? null);
    } catch (falha) {
      setErro(mensagemDe(falha, "Não foi possível remover o roteiro."));
    }
  }

  // Os lugares do roteiro não ficam guardados (termos do Google Maps); abrir é gerar de novo
  // com a mesma origem e o mesmo destino.
  async function abrir(roteiro: RoteiroSalvo) {
    const trajeto = paraReabrir(roteiro);
    if (!trajeto) return;
    setErro(null);
    setAbrindoId(roteiro.id);
    try {
      const resultado = await gerarRoteiro(trajeto);
      window.sessionStorage.setItem("kyr:last-roteiro", JSON.stringify(resultado));
      router.push("/roteiro/resultado");
    } catch (falha) {
      setErro(mensagemDe(falha, "Não foi possível abrir o roteiro. Tente novamente."));
      setAbrindoId(null);
    }
  }

  return (
    <div className={styles.shell}>
      <ExploreSidebar active="historico" />
      <main className={styles.main}>
        <header className={styles.header}>
          <div>
            <h1>Meus roteiros</h1>
            <p>
              {logado
                ? "Roteiros salvos na sua conta e neste dispositivo."
                : "Roteiros salvos neste dispositivo. Entre na sua conta para guardá-los em qualquer lugar."}
            </p>
          </div>
          <Link className={styles.newButton} href="/criar-roteiro">
            <Plus size={16} weight="bold" aria-hidden="true" /> Criar nova rota
          </Link>
        </header>

        {erro && <p className={styles.erro} role="alert">{erro}</p>}
        {roteiros === null && <p className={styles.status} role="status">Carregando…</p>}

        {roteiros !== null && roteiros.length === 0 && !erro && (
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
              const abrindo = abrindoId === roteiro.id;
              // Depois de 30 dias o nome da origem e do destino é apagado junto com as coordenadas.
              const origem = roteiro.origem.nome || "Origem apagada";
              const destino = roteiro.destino.nome || "destino apagado";
              return (
                <li className={styles.card} key={`${roteiro.onde}-${roteiro.id}`}>
                  <div className={styles.cardInfo}>
                    <h2>{origem} <ArrowRight size={14} aria-hidden="true" /> {destino}</h2>
                    <p className={styles.meta}>
                      {roteiro.totalPontos} {roteiro.totalPontos === 1 ? "ponto sugerido" : "pontos sugeridos"}
                      {formatarData(roteiro.criadoEm) && ` · salvo em ${formatarData(roteiro.criadoEm)}`}
                      {` · ${roteiro.onde === "conta" ? "na sua conta" : "neste dispositivo"}`}
                    </p>
                    {adicionados.length > 0 && (
                      <p className={styles.added}>Destinos adicionados: {adicionados.join(", ")}</p>
                    )}
                    {roteiro.podeReabrir ? (
                      <button
                        type="button"
                        className={styles.abrir}
                        onClick={() => void abrir(roteiro)}
                        disabled={abrindoId !== null}
                      >
                        {abrindo ? "Gerando o roteiro…" : "Abrir roteiro"}
                        {!abrindo && <ArrowRight size={14} weight="bold" aria-hidden="true" />}
                      </button>
                    ) : (
                      <p className={styles.vencido}>
                        Salvo há mais de {DIAS_DE_VALIDADE_DAS_COORDENADAS} dias: a origem e o destino foram apagados. Para abrir de novo,{" "}
                        <Link href="/criar-roteiro">crie o roteiro outra vez</Link>.
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    className={styles.remove}
                    onClick={() => void remover(roteiro)}
                    aria-label={`Remover roteiro ${origem} para ${destino}`}
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

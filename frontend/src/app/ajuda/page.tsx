import type { Metadata } from "next";
import Link from "next/link";
import ExploreSidebar from "@/components/ExploreSidebar";
import styles from "./ajuda.module.css";

export const metadata: Metadata = { title: "Ajuda | Kyr" };

const PERGUNTAS: Array<{ pergunta: string; resposta: React.ReactNode }> = [
  {
    pergunta: "O que é o Kyr?",
    resposta: (
      <>
        Kyr (Know Your Route) sugere lugares para visitar no caminho entre dois pontos. Você informa a origem e o
        destino; o Kyr busca lugares próximos ao trajeto no Google Maps, uma inteligência artificial classifica e
        descreve cada um, e o resultado vem em ordem de visita.
      </>
    ),
  },
  {
    pergunta: "Como crio um roteiro?",
    resposta: (
      <>
        Em <Link href="/criar-roteiro">Criar roteiro</Link>, escolha a origem e o destino na lista de sugestões e
        toque em &quot;Gerar roteiro&quot;. Em alguns segundos você vê a lista de paradas sugeridas e o mapa.
      </>
    ),
  },
  {
    pergunta: "Para que servem as paradas e o meio de transporte?",
    resposta: (
      <>
        Eles mudam o trajeto desenhado no mapa da tela de criação, com o tempo e a distância. Os lugares sugeridos na
        etapa seguinte consideram a origem e o destino, de carro.
      </>
    ),
  },
  {
    pergunta: "O que significam as etiquetas dos lugares?",
    resposta: (
      <>
        Cada lugar recebe uma trilha (Turismo ou Compras) e um tipo (Alimentação ou Lazer). Essa classificação e a
        descrição são feitas por inteligência artificial e podem conter erros: confirme horários e detalhes antes de
        sair.
      </>
    ),
  },
  {
    pergunta: "Por que alguns lugares aparecem sem descrição?",
    resposta: (
      <>
        Quando a inteligência artificial está indisponível, o roteiro é entregue mesmo assim, só com o nome e o
        endereço dos lugares. Um aviso aparece no topo do resultado.
      </>
    ),
  },
  {
    pergunta: "Preciso de conta?",
    resposta: (
      <>
        Não. Sem conta, favoritos e roteiros salvos ficam só neste dispositivo. Com uma{" "}
        <Link href="/cadastro">conta</Link>, os roteiros salvos ficam disponíveis em qualquer dispositivo e você pode
        avaliar destinos.
      </>
    ),
  },
  {
    pergunta: "O que fica guardado quando salvo um roteiro?",
    resposta: (
      <>
        A origem e o destino que você escolheu. Os lugares sugeridos não ficam guardados: ao abrir um roteiro salvo, o
        Kyr gera as sugestões de novo, então elas podem mudar. Depois de 30 dias é preciso escolher origem e destino
        outra vez.
      </>
    ),
  },
  {
    pergunta: "De quem são as avaliações dos destinos?",
    resposta: <>São de pessoas com conta no Kyr. Não são avaliações do Google Maps.</>,
  },
];

export default function AjudaPage() {
  return (
    <div className={styles.shell}>
      <ExploreSidebar active="ajuda" />
      <main className={styles.main}>
        <header className={styles.header}>
          <h1>Ajuda</h1>
          <p>Como o Kyr funciona e o que esperar de cada tela.</p>
        </header>
        <div className={styles.lista}>
          {PERGUNTAS.map(({ pergunta, resposta }) => (
            <details key={pergunta} className={styles.item}>
              <summary>{pergunta}</summary>
              <p>{resposta}</p>
            </details>
          ))}
        </div>
        <p className={styles.creditos}>
          Mapas, trajetos e busca de lugares: Google Maps. Projeto de conclusão de curso (ADS, IFPE Campus Palmares).
        </p>
      </main>
    </div>
  );
}

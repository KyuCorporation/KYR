"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import RoteiroList from "@/components/RoteiroList";
import RoteiroMap from "@/components/RoteiroMap";
import { mockRoteiroComDados, mockRoteiroVazio } from "@/mocks/mockRoteiro";

// Conteúdo interativo da demonstração da US-09 (lista) + US-20 (mapa),
// isolado da US-08 (formulário) e da US-05 (endpoint real). Serve para
// validar visualmente lista e mapa juntos com dados mockados.
//
// Layout inspirado na referência do Figma (tela "Criar rota"): card
// arredondado sobre fundo escuro, lista à esquerda, mapa fixo à direita
// ocupando o resto da altura. Clicar num ponto da lista destaca ele no
// mapa (e vice-versa), com a rota entre os pontos desenhada como uma linha.
//
// O mapa (US-20) só reage aos cenários "comDados" e "vazio" — os estados
// de "erro" e "carregando" do mapa são próprios (dependem do script do
// Google Maps carregar ou não), então não fazem parte desse seletor.

type Cenario = "comDados" | "vazio" | "erro" | "carregando";

export default function RoteiroDemoClient() {
  const router = useRouter();
  const [cenario, setCenario] = useState<Cenario>("comDados");
  const [pontoSelecionadoId, setPontoSelecionadoId] = useState<string | null>(null);

  const pontosParaOMapa = cenario === "comDados" ? mockRoteiroComDados.pontos : [];

  return (
    <div className="flex h-screen w-full items-center justify-center bg-zinc-950 p-4 sm:p-8">
      <div className="flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-zinc-800 bg-white shadow-2xl dark:bg-zinc-950">
        {/* Seletor de cenário — só existe nessa página de demonstração,
            não faz parte do layout final (US-08 vai substituir isso). */}
        <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 px-6 py-3 dark:border-zinc-800">
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Cenário de teste:
          </span>
          <CenarioButton atual={cenario} valor="comDados" onClick={setCenario}>
            Com dados
          </CenarioButton>
          <CenarioButton atual={cenario} valor="vazio" onClick={setCenario}>
            Vazio
          </CenarioButton>
          <CenarioButton atual={cenario} valor="erro" onClick={setCenario}>
            Erro
          </CenarioButton>
          <CenarioButton atual={cenario} valor="carregando" onClick={setCenario}>
            Carregando
          </CenarioButton>
        </div>

        <div className="flex min-h-0 flex-1">
          {/* Painel esquerdo — lista */}
          <div className="flex w-full max-w-sm flex-col border-r border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2 px-6 py-5">
              <button
                type="button"
                onClick={() => router.back()}
                aria-label="Voltar"
                className="text-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                ←
              </button>
              <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                Roteiro de turismo
              </h1>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-6">
              <RoteiroList
                data={
                  cenario === "comDados"
                    ? mockRoteiroComDados
                    : cenario === "vazio"
                      ? mockRoteiroVazio
                      : undefined
                }
                error={cenario === "erro" ? "Falha ao conectar com o backend-core." : undefined}
                isLoading={cenario === "carregando"}
                pontoSelecionadoId={pontoSelecionadoId}
                onSelecionarPonto={setPontoSelecionadoId}
              />
            </div>
          </div>

          {/* Painel direito — mapa fixo, ocupando o restante da tela.
              O overflow-hidden + rounded-3xl do card pai já arredonda os
              cantos direitos do mapa automaticamente, então o próprio
              RoteiroMap fica sem borda/raio próprios (semBorda). */}
          <div className="flex-1">
            <RoteiroMap
              pontos={pontosParaOMapa}
              pontoSelecionadoId={pontoSelecionadoId}
              onSelecionarPonto={setPontoSelecionadoId}
              altura="h-full"
              semBorda
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function CenarioButton({
  atual,
  valor,
  onClick,
  children,
}: {
  atual: Cenario;
  valor: Cenario;
  onClick: (v: Cenario) => void;
  children: React.ReactNode;
}) {
  const ativo = atual === valor;
  return (
    <button
      type="button"
      onClick={() => onClick(valor)}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        ativo
          ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
          : "border-zinc-300 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
      }`}
    >
      {children}
    </button>
  );
}
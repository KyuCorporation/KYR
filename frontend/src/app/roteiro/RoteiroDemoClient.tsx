"use client";

import { useState } from "react";
import RoteiroList from "@/components/RoteiroList";
import { mockRoteiroComDados, mockRoteiroVazio } from "@/mocks/mockRoteiro";

// Conteúdo interativo da demonstração da US-09, isolado da US-08 (formulário)
// e da US-05 (endpoint real). Serve para validar visualmente a lista com os
// três cenários que os critérios de aceite pedem: com dados, vazio e erro.

type Cenario = "comDados" | "vazio" | "erro" | "carregando";

export default function RoteiroDemoClient() {
  const [cenario, setCenario] = useState<Cenario>("comDados");

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Demonstração — Lista do Roteiro (US-09)
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Página temporária para validar o componente com dados mockados.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
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

      <RoteiroList
        data={cenario === "comDados" ? mockRoteiroComDados : cenario === "vazio" ? mockRoteiroVazio : undefined}
        error={cenario === "erro" ? "Falha ao conectar com o backend-core." : undefined}
        isLoading={cenario === "carregando"}
      />
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
      className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
        ativo
          ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
          : "border-zinc-300 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
      }`}
    >
      {children}
    </button>
  );
}
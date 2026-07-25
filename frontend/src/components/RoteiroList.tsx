"use client";

import { PontoDeInteresse, RoteiroResponse, Trilha, TipoPonto } from "@/types/roteiro";

// US-09 — Exibição do roteiro em lista
// Critérios de aceite:
// - Lista mostra nome, trilha (turismo/compras) e tipo (alimentação/lazer) de cada ponto
// - Estados vazio e de erro tratados com mensagens claras

const TRILHA_LABEL: Record<Trilha, string> = {
  turismo: "Turismo",
  compras: "Compras",
};

const TIPO_LABEL: Record<TipoPonto, string> = {
  alimentacao: "Alimentação",
  lazer: "Lazer",
};

const TRILHA_BADGE_CLASS: Record<Trilha, string> = {
  turismo: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  compras: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
};

const TIPO_BADGE_CLASS: Record<TipoPonto, string> = {
  alimentacao: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  lazer: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
};

interface RoteiroListProps {
  data?: RoteiroResponse;
  error?: string;
  isLoading?: boolean;
}

export default function RoteiroList({ data, error, isLoading }: RoteiroListProps) {
  if (isLoading) {
    return (
      <div
        role="status"
        className="flex items-center justify-center py-12 text-sm text-zinc-500 dark:text-zinc-400"
      >
        Carregando roteiro...
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
      >
        <p className="font-medium">Não foi possível carregar o roteiro.</p>
        <p className="mt-1 text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (!data || data.pontos.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
        <p className="font-medium text-zinc-700 dark:text-zinc-200">
          Nenhum ponto encontrado para esse roteiro.
        </p>
        <p className="mt-1">Tente ajustar a origem ou o destino informados.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <p className="mb-3 text-sm text-zinc-500 dark:text-zinc-400">
        {data.metadados.origem} → {data.metadados.destino}
      </p>
      <ul className="flex flex-col gap-3">
        {data.pontos.map((ponto) => (
          <RoteiroListItem key={ponto.id} ponto={ponto} />
        ))}
      </ul>
    </div>
  );
}

function RoteiroListItem({ ponto }: { ponto: PontoDeInteresse }) {
  return (
    <li className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-medium text-zinc-900 dark:text-zinc-50">{ponto.nome}</h3>
      </div>
      {ponto.descricao && (
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{ponto.descricao}</p>
      )}
      <div className="mt-3 flex gap-2">
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${TRILHA_BADGE_CLASS[ponto.trilha]}`}
        >
          {TRILHA_LABEL[ponto.trilha]}
        </span>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${TIPO_BADGE_CLASS[ponto.tipo]}`}
        >
          {TIPO_LABEL[ponto.tipo]}
        </span>
      </div>
    </li>
  );
}

"use client";

import { PontoDeInteresse, RoteiroResponse, Trilha, TipoPonto } from "@/types/roteiro";

// US-09 — Exibição do roteiro em lista
// Critérios de aceite:
// Lista mostra nome, trilha (turismo/compras) e tipo (alimentação/lazer) de cada ponto
// Estados vazio e de erro tratados com mensagens claras

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

// Fallback neutro para quando o backend mandar um valor fora do union
// atual (ex: uma trilha/tipo nova que o frontend ainda não conhece).
// Evita className="... undefined" e mostra o valor cru em vez de sumir.

const BADGE_CLASS_DESCONHECIDO =
  "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";

interface RoteiroListProps {
  data?: RoteiroResponse;
  error?: string;
  isLoading?: boolean;
  /** id do ponto selecionado (ex: clicado no mapa ao lado). Opcional. */
  pontoSelecionadoId?: string | null;
  /** chamado ao clicar num item da lista, para sincronizar com o mapa. */
  onSelecionarPonto?: (id: string) => void;
}

export default function RoteiroList({
  data,
  error,
  isLoading,
  pontoSelecionadoId = null,
  onSelecionarPonto,
}: RoteiroListProps) {
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
          <RoteiroListItem
            key={ponto.id}
            ponto={ponto}
            selecionado={ponto.id === pontoSelecionadoId}
            onSelecionar={onSelecionarPonto}
          />
        ))}
      </ul>
    </div>
  );
}

interface RoteiroListItemProps {
  ponto: PontoDeInteresse;
  selecionado?: boolean;
  onSelecionar?: (id: string) => void;
}

function RoteiroListItem({ ponto, selecionado = false, onSelecionar }: RoteiroListItemProps) {
  const clicavel = Boolean(onSelecionar);

  return (
    <li
      onClick={clicavel ? () => onSelecionar?.(ponto.id) : undefined}
      role={clicavel ? "button" : undefined}
      tabIndex={clicavel ? 0 : undefined}
      onKeyDown={
        clicavel
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelecionar?.(ponto.id);
              }
            }
          : undefined
      }
      className={`rounded-lg border bg-white p-4 shadow-sm transition-colors dark:bg-zinc-900 ${
        clicavel ? "cursor-pointer hover:border-orange-300 dark:hover:border-orange-700" : ""
      } ${
        selecionado
          ? "border-orange-500 ring-1 ring-orange-500 dark:border-orange-500"
          : "border-zinc-200 dark:border-zinc-800"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-medium text-zinc-900 dark:text-zinc-50">{ponto.nome}</h3>
      </div>
      {ponto.descricao && (
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{ponto.descricao}</p>
      )}
      <div className="mt-3 flex gap-2">
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            TRILHA_BADGE_CLASS[ponto.trilha] ?? BADGE_CLASS_DESCONHECIDO
          }`}
        >
          {TRILHA_LABEL[ponto.trilha] ?? ponto.trilha}
        </span>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            TIPO_BADGE_CLASS[ponto.tipo] ?? BADGE_CLASS_DESCONHECIDO
          }`}
        >
          {TIPO_LABEL[ponto.tipo] ?? ponto.tipo}
        </span>
      </div>
    </li>
  );
}
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
  turismo: "bg-emerald-100 text-emerald-800",
  compras: "bg-amber-100 text-amber-800",
};

const TIPO_BADGE_CLASS: Record<TipoPonto, string> = {
  alimentacao: "bg-orange-100 text-orange-800",
  lazer: "bg-sky-100 text-sky-800",
};

// Fallback neutro para quando o backend mandar um valor fora do union
// atual (ex: uma trilha/tipo nova que o frontend ainda não conhece).
// Evita className="... undefined" e mostra o valor cru em vez de sumir.

const BADGE_CLASS_DESCONHECIDO =
  "bg-[#eef0ef] text-[#263d44]";

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
        className="flex items-center justify-center py-12 text-sm text-[#56636c]"
      >
        Carregando roteiro...
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
      >
        <p className="font-medium">Não foi possível carregar o roteiro.</p>
        <p className="mt-1 text-red-600">{error}</p>
      </div>
    );
  }

  if (!data || data.pontos.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[#d5d9d7] p-8 text-center text-sm text-[#56636c]">
        <p className="font-medium text-[#263d44]">
          Nenhum ponto encontrado para esse roteiro.
        </p>
        <p className="mt-1">Tente ajustar a origem ou o destino informados.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <p className="mb-3 text-sm text-[#56636c]">
        {data.origem.nome} → {data.destino.nome}
      </p>
      <ul className="flex flex-col gap-3">
        {data.pontos.map((ponto, indice) => (
          <RoteiroListItem
            key={ponto.id}
            ponto={ponto}
            ordem={indice + 1}
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
  /** Posição na ordem de visita: o mesmo número do marcador no mapa. */
  ordem: number;
  selecionado?: boolean;
  onSelecionar?: (id: string) => void;
}

function RoteiroListItem({ ponto, ordem, selecionado = false, onSelecionar }: RoteiroListItemProps) {
  const clicavel = Boolean(onSelecionar);
  // Ponto sem curadoria da IA não tem trilha nem tipo: esconde as etiquetas em vez de mostrar "desconhecida".
  const semClassificacao = ponto.curado === false;

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
      className={`rounded-lg border bg-white p-4 transition-colors ${
        clicavel ? "cursor-pointer hover:border-[#e9b48f]" : ""
      } ${
        selecionado
          ? "border-[#d65b0c] ring-1 ring-[#d65b0c]"
          : "border-[#d5d9d7]"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="mt-0.5 grid h-6 w-6 flex-none place-items-center rounded-full bg-[#fbefe7] text-xs font-bold text-[#b4480a]"
        >
          {ordem}
        </span>
        <h3 className="font-semibold text-[#1f2d3a]">{ponto.nome}</h3>
      </div>
      {ponto.descricao && (
        <p className="mt-1 text-sm text-[#3f4b52]">{ponto.descricao}</p>
      )}
      {!semClassificacao && (
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
      )}
    </li>
  );
}
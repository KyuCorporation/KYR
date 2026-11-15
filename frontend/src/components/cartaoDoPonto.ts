import type { PontoDeInteresse } from "@/types/roteiro";

// Monta o HTML do cartão que abre no mapa quando um ponto do roteiro é clicado.
// É HTML em texto porque o InfoWindow do Google Maps recebe conteúdo pronto, fora da árvore do React;
// por isso todo valor que vem de fora passa por escapeHtml.

const TRILHA_LABEL: Record<string, string> = { turismo: "Turismo", compras: "Compras" };
const TIPO_LABEL: Record<string, string> = { alimentacao: "Alimentação", lazer: "Lazer" };
const TRILHA_COR: Record<string, string> = { turismo: "#047857", compras: "#b45309" };

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function formatarDistancia(metros: number | null): string | null {
  if (metros === null) return null;
  if (metros < 1000) return `${Math.round(metros)} m`;
  return `${(metros / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km`;
}

export function formatarDuracao(segundos: number | null): string | null {
  if (segundos === null) return null;
  const minutos = Math.max(1, Math.round(segundos / 60));
  const horas = Math.floor(minutos / 60);
  return horas > 0 ? `${horas}h ${minutos % 60}min` : `${minutos} min`;
}

function linkSeguro(url: string): string | null {
  return /^https:\/\//i.test(url) ? url : null;
}

/**
 * @param ordem posição do ponto no roteiro, começando em 1
 * @param anterior nome do lugar de onde o trecho parte (a origem ou o ponto anterior)
 */
export function montarCartaoDoPonto(ponto: PontoDeInteresse, ordem: number, anterior?: string): string {
  const cor = TRILHA_COR[ponto.trilha] ?? "#52525b";
  const etiquetas = ponto.curado === false
    ? ""
    : [TRILHA_LABEL[ponto.trilha] ?? ponto.trilha, TIPO_LABEL[ponto.tipo] ?? ponto.tipo]
        .filter(Boolean)
        .map((texto) => `<span style="padding:2px 9px;border-radius:999px;background:#f1f5f4;color:#263d44;font-size:12px;font-weight:600;">${escapeHtml(texto)}</span>`)
        .join("");

  const distancia = formatarDistancia(ponto.distanciaMetros);
  const duracao = formatarDuracao(ponto.duracaoSegundos);
  const trecho = distancia && duracao
    ? `<p style="margin:8px 0 0;color:#263d44;font-size:13px;"><strong>${escapeHtml(distancia)}</strong> · ${escapeHtml(duracao)} de carro${anterior ? ` a partir de ${escapeHtml(anterior)}` : ""}</p>`
    : "";

  const descricao = ponto.descricao
    ? `<p style="margin:8px 0 0;color:#3f4b52;font-size:13px;line-height:1.45;">${escapeHtml(ponto.descricao)}</p>`
    : "";
  const endereco = ponto.endereco
    ? `<p style="margin:8px 0 0;color:#637078;font-size:12px;line-height:1.4;">${escapeHtml(ponto.endereco)}</p>`
    : "";
  const link = linkSeguro(ponto.fonte);
  const acao = link
    ? `<a href="${escapeHtml(link)}" target="_blank" rel="noreferrer" style="display:inline-block;margin-top:10px;color:#b4480a;font-size:13px;font-weight:700;text-decoration:none;">Abrir no Google Maps →</a>`
    : "";

  return `<div style="max-width:280px;padding:2px 4px 4px;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:flex;align-items:center;gap:8px;">
    <span style="flex:0 0 auto;width:24px;height:24px;display:grid;place-items:center;border-radius:50%;background:${cor};color:#fff;font-size:12px;font-weight:700;">${ordem}</span>
    <strong style="color:#1f2d3a;font-size:15px;line-height:1.25;">${escapeHtml(ponto.nome)}</strong>
  </div>
  ${etiquetas ? `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;">${etiquetas}</div>` : ""}
  ${descricao}${trecho}${endereco}${acao}
</div>`;
}

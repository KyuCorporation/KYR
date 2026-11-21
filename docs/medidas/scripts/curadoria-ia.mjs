// Mede a curadoria do ia-service contra a curadoria manual de docs/dataset-pois-foz.json.
// Chama POST /curar-roteiro com os 18 lugares do dataset (em lotes de até 10, como o
// backend-core faz) e compara trilha e tipo devolvidos pela IA com os do dataset.
// Não chama o Google. Chama o LLM configurado no ia-service (pode ter custo).
//
// Uso: node docs/medidas/scripts/curadoria-ia.mjs <url-do-ia-service> <rótulo> [rodadas]
// Ex.: node docs/medidas/scripts/curadoria-ia.mjs http://localhost:8000 cadeia-normal 3
//
// O ia-service recebe só nome e categoria. Como o dataset não tem a categoria do Google,
// todos os lugares vão com a categoria genérica "ponto_de_interesse": a IA classifica só
// pelo nome, o que torna a medida conservadora.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const [url, rotulo, rodadasArg] = process.argv.slice(2);
if (!url || !rotulo) {
  console.error("Uso: node curadoria-ia.mjs <url-do-ia-service> <rótulo> [rodadas]");
  process.exit(1);
}
const rodadas = Number(rodadasArg ?? 1);
const LIMITE_DESCRICAO = 300; // kyu.llm.max-descricao-chars no ia-service
const TAMANHO_LOTE = 10; // roteiro.max-pois-curadoria no backend-core

const dataset = JSON.parse(readFileSync("docs/dataset-pois-foz.json", "utf8"));
const gabarito = new Map(dataset.map((p) => [p.nome, p]));
const lotes = [];
for (let i = 0; i < dataset.length; i += TAMANHO_LOTE) lotes.push(dataset.slice(i, i + TAMANHO_LOTE));

const chamadas = [];
for (let r = 1; r <= rodadas; r++) {
  for (const [i, lote] of lotes.entries()) {
    const corpo = { pontos: lote.map((p) => ({ nome: p.nome, categoria: "ponto_de_interesse" })) };
    const inicio = performance.now();
    const resp = await fetch(`${url}/curar-roteiro`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corpo),
    });
    const ms = Math.round(performance.now() - inicio);
    const json = await resp.json();
    const pontos = json.pontos ?? [];
    let curados = 0, trilhaOk = 0, tipoOk = 0, ambosOk = 0, nomesPreservados = 0;
    const descricoes = [];
    for (const p of pontos) {
      const g = gabarito.get(p.nome);
      if (g) nomesPreservados++;
      if (!p.curado) continue;
      curados++;
      descricoes.push((p.descricao ?? "").length);
      if (g && p.trilha === g.trilha) trilhaOk++;
      if (g && p.tipo === g.tipo) tipoOk++;
      if (g && p.trilha === g.trilha && p.tipo === g.tipo) ambosOk++;
    }
    const chamada = {
      rodada: r, lote: i + 1, status: resp.status, ms, enviados: lote.length,
      modelo: json.modelo_utilizado ?? "nenhum", curadoPorIa: json.curado_por_ia,
      curados, nomesPreservados, trilhaOk, tipoOk, ambosOk, descricoes,
      pontos: pontos.map(({ nome, trilha, tipo, descricao, curado }) => ({ nome, trilha, tipo, descricao, curado })),
    };
    chamadas.push(chamada);
    console.error(`rodada ${r} lote ${i + 1}: ${resp.status} em ${ms} ms, ${chamada.modelo}, ${curados}/${lote.length} curados`);
  }
}

mkdirSync("docs/medidas/dados", { recursive: true });
writeFileSync(`docs/medidas/dados/curadoria-${rotulo}.json`, JSON.stringify({ rotulo, rodadas, chamadas }, null, 2));

const soma = (k) => chamadas.reduce((a, c) => a + c[k], 0);
const ms = chamadas.map((c) => c.ms).sort((a, b) => a - b);
const mediana = ms[Math.floor(ms.length / 2)];
const curados = soma("curados");
const enviados = soma("enviados");
const desc = chamadas.flatMap((c) => c.descricoes);
const pct = (a, b) => (b ? ((100 * a) / b).toFixed(1) + "%" : "–");
const vezes = chamadas.reduce((a, c) => ({ ...a, [c.modelo]: (a[c.modelo] ?? 0) + 1 }), {});
const modelos = Object.entries(vezes).map(([m, n]) => `${m} (${n}×)`).join(", ");

console.log(`| Cenário | Chamadas | Modelo que respondeu | Latência mín / mediana / máx (ms) | Lugares curados | Trilha igual ao manual | Tipo igual ao manual | Trilha e tipo iguais | Descrição média (caracteres) | Descrições ≤ ${LIMITE_DESCRICAO} |`);
console.log("|---|---:|---|---|---:|---:|---:|---:|---:|---:|");
console.log(
  `| ${rotulo} | ${chamadas.length} | ${modelos} | ${ms[0]} / ${mediana} / ${ms.at(-1)} | ${pct(curados, enviados)} (${curados}/${enviados}) | ` +
  `${pct(soma("trilhaOk"), curados)} | ${pct(soma("tipoOk"), curados)} | ${pct(soma("ambosOk"), curados)} | ` +
  `${desc.length ? Math.round(desc.reduce((a, b) => a + b, 0) / desc.length) : "–"} | ${pct(desc.filter((d) => d <= LIMITE_DESCRICAO).length, desc.length)} |`
);

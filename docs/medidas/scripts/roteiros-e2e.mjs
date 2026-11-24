// Gera roteiros reais pelo POST /roteiros do backend-core e registra o que a resposta traz:
// tempo, quantos lugares, quantos curados pela IA, quem curou, se a rota foi ordenada pelo
// Google, e a soma dos trechos. Também confere as respostas de validação (400), que não
// chegam ao Google.
//
// ATENÇÃO: cada cenário com status 200 gasta até 8 buscas no Places, 1 busca de rota e
// 1 ordenação na conta do Google. Registre as chamadas no controle de cota.
//
// Uso: node docs/medidas/scripts/roteiros-e2e.mjs <url-do-backend-core> [rótulo]
// Ex.: node docs/medidas/scripts/roteiros-e2e.mjs http://localhost:8080
import { writeFileSync, mkdirSync } from "node:fs";

const [url, rotulo = "e2e"] = process.argv.slice(2);
if (!url) {
  console.error("Uso: node roteiros-e2e.mjs <url-do-backend-core> [rótulo]");
  process.exit(1);
}

// Mesmos lugares do autocomplete de demonstração do frontend (criar-roteiro/mockPlaces.ts).
const aeroporto = { nome: "Aeroporto Internacional de Foz do Iguaçu", latitude: -25.5930876, longitude: -54.4909835 };
const carima = { nome: "Grand Carimã Resort & Convention Center", latitude: -25.5768507, longitude: -54.5485245 };
const marco = { nome: "Marco das Três Fronteiras", latitude: -25.5901531, longitude: -54.5902488 };
const parqueAves = { nome: "Parque das Aves", latitude: -25.6150914, longitude: -54.4841325 };

const cenarios = [
  { nome: "Carro, sem paradas (cache vazio)", corpo: { origem: aeroporto, destino: carima, transporte: "DRIVING" } },
  { nome: "Carro, sem paradas (repetição: cache da curadoria)", corpo: { origem: aeroporto, destino: carima, transporte: "DRIVING" } },
  { nome: "A pé, sem paradas", corpo: { origem: aeroporto, destino: carima, transporte: "WALKING" } },
  { nome: "Bicicleta, sem paradas", corpo: { origem: aeroporto, destino: carima, transporte: "BICYCLING" } },
  { nome: "Transporte público, sem paradas", corpo: { origem: aeroporto, destino: carima, transporte: "TRANSIT" } },
  { nome: "Carro, 2 paradas (Parque das Aves e Marco)", corpo: { origem: aeroporto, destino: carima, paradas: [parqueAves, marco], transporte: "DRIVING" } },
];

// Requisições inválidas: o backend recusa antes de chamar o Google.
const invalidos = [
  { nome: "Sem origem", corpo: { destino: carima } },
  { nome: "Latitude ausente no destino", corpo: { origem: aeroporto, destino: { nome: "X", longitude: -54.5 } } },
  { nome: "9 paradas (limite é 8)", corpo: { origem: aeroporto, destino: carima, paradas: Array(9).fill(marco) } },
  { nome: "Transporte desconhecido", corpo: { origem: aeroporto, destino: carima, transporte: "FOGUETE" } },
];

const chamar = async (corpo) => {
  const inicio = performance.now();
  const resp = await fetch(`${url}/roteiros`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
  });
  const ms = Math.round(performance.now() - inicio);
  let json = null;
  try { json = await resp.json(); } catch { /* corpo vazio */ }
  return { status: resp.status, ms, json };
};

const resultados = [];
for (const c of cenarios) {
  const r = await chamar(c.corpo);
  const pontos = r.json?.pontos ?? [];
  const sugeridos = pontos.filter((p) => !p.parada);
  const m = r.json?.metadados ?? {};
  const trechos = pontos.filter((p) => p.distanciaMetros != null);
  const linha = {
    cenario: c.nome, status: r.status, msCliente: r.ms, msServidor: m.tempoRespostaMs,
    totalPontos: m.totalPontos, sugeridos: sugeridos.length, paradas: pontos.length - sugeridos.length,
    curados: sugeridos.filter((p) => p.curado).length, fonteIA: m.fonteIA, curadoPorIa: m.curadoPorIa,
    fonteRota: m.fonteRota, transporte: m.transporte,
    // Total do percurso, da origem ao destino (inclui o trecho do último ponto até o destino).
    distanciaKm: m.distanciaTotalMetros != null ? m.distanciaTotalMetros / 1000 : null,
    duracaoMin: m.duracaoTotalSegundos != null ? m.duracaoTotalSegundos / 60 : null,
    // Soma só dos trechos de cada ponto (sem o trecho final), comparável às medições anteriores.
    distanciaTrechosKm: trechos.length ? trechos.reduce((a, p) => a + p.distanciaMetros, 0) / 1000 : null,
    duracaoTrechosMin: trechos.length ? trechos.reduce((a, p) => a + (p.duracaoSegundos ?? 0), 0) / 60 : null,
    trilhas: contar(sugeridos, "trilha"), tipos: contar(sugeridos, "tipo"),
    lugares: sugeridos.map((p) => ({ nome: p.nome, trilha: p.trilha, tipo: p.tipo, curado: p.curado, descricao: p.descricao })),
    erro: r.status >= 400 ? r.json : undefined,
  };
  resultados.push(linha);
  console.error(`${c.nome}: ${r.status} em ${r.ms} ms`);
}

const validacao = [];
for (const c of invalidos) {
  const r = await chamar(c.corpo);
  validacao.push({ cenario: c.nome, status: r.status, ms: r.ms, mensagem: r.json?.mensagem ?? r.json?.message ?? r.json?.detail ?? null });
}

function contar(lista, campo) {
  return lista.reduce((a, p) => ({ ...a, [p[campo] ?? "sem"]: (a[p[campo] ?? "sem"] ?? 0) + 1 }), {});
}

mkdirSync("docs/medidas/dados", { recursive: true });
writeFileSync(`docs/medidas/dados/roteiros-${rotulo}.json`, JSON.stringify({ geradoEm: new Date().toISOString(), resultados, validacao }, null, 2));

const n = (v, d = 1) => (v == null ? "–" : Number(v).toFixed(d));
console.log("| Cenário | Status | Tempo no cliente (ms) | Tempo no servidor (ms) | Lugares sugeridos | Curados pela IA | Quem curou | Ordem da rota | Distância total (km) | Duração total (min) | Distância até o último ponto (km) |");
console.log("|---|---:|---:|---:|---:|---:|---|---|---:|---:|---:|");
for (const r of resultados) {
  console.log(`| ${r.cenario} | ${r.status} | ${r.msCliente} | ${r.msServidor ?? "–"} | ${r.sugeridos} | ${r.curados} | ${r.fonteIA ?? "–"} | ${r.fonteRota ?? "–"} | ${n(r.distanciaKm)} | ${n(r.duracaoMin, 0)} | ${n(r.distanciaTrechosKm)} |`);
}
console.log("\n| Requisição inválida | Status | Tempo (ms) | Mensagem |");
console.log("|---|---:|---:|---|");
for (const v of validacao) console.log(`| ${v.cenario} | ${v.status} | ${v.ms} | ${v.mensagem ?? "–"} |`);

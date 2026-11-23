// Roda o Lighthouse (emulação de celular, padrão da ferramenta) nas páginas do frontend
// e resume as notas e as métricas de carregamento.
// Pré-requisitos: frontend em modo produção (`npm run build` e `npx next start`) e um
// Chrome ou Edge instalado. Baixa o Lighthouse pelo npx na primeira vez.
// /criar-roteiro carrega o Maps JavaScript (1 carregamento de mapa na cota do Google).
//
// Uso: node docs/medidas/scripts/lighthouse.mjs <url-do-frontend> [caminho-do-navegador | porta]
// Ex.: node docs/medidas/scripts/lighthouse.mjs http://localhost:3100 "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
// Ou, com o Edge aberto antes:
//   msedge --headless=new --remote-debugging-port=9333 --user-data-dir=<pasta-temporária> about:blank
//   node docs/medidas/scripts/lighthouse.mjs http://localhost:3100 9333
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const [base, navegador] = process.argv.slice(2);
if (!base) {
  console.error("Uso: node lighthouse.mjs <url-do-frontend> [caminho-do-navegador]");
  process.exit(1);
}
const paginas = ["/", "/inicio", "/criar-roteiro", "/explorar", "/roteiros", "/favoritos", "/entrar", "/cadastro", "/ajuda"];
const categorias = ["performance", "accessibility", "best-practices", "seo"];

const resultados = [];
for (const pagina of paginas) {
  const saida = join(tmpdir(), `lh-${Date.now()}.json`);
  const args = [
    "-y", "lighthouse@12.6.1", base + pagina,
    `--only-categories=${categorias.join(",")}`,
    "--output=json", `--output-path=${saida}`, "--quiet",
  ];
  // Um número é a porta de depuração de um navegador já aberto (útil quando o Lighthouse
  // não consegue abrir o Edge sozinho no Windows). Um caminho é o executável do navegador,
  // que o chrome-launcher do Lighthouse lê da variável CHROME_PATH.
  const porta = /^\d+$/.test(navegador ?? "");
  if (porta) args.push(`--port=${navegador}`);
  else args.push('"--chrome-flags=--headless=new --no-first-run"');
  const env = navegador && !porta ? { ...process.env, CHROME_PATH: navegador } : process.env;
  const r = spawnSync("npx", args, { shell: true, env, stdio: ["ignore", "ignore", "pipe"], encoding: "utf8" });
  let lh;
  try { lh = JSON.parse(readFileSync(saida, "utf8")); } catch {
    console.error(`${pagina}: falhou\n${r.stderr?.slice(-500)}`);
    continue;
  }
  rmSync(saida, { force: true });
  const nota = (c) => Math.round((lh.categories[c]?.score ?? 0) * 100);
  const valor = (id) => lh.audits[id]?.numericValue;
  resultados.push({
    pagina,
    notas: Object.fromEntries(categorias.map((c) => [c, nota(c)])),
    fcpMs: valor("first-contentful-paint"), lcpMs: valor("largest-contentful-paint"),
    tbtMs: valor("total-blocking-time"), cls: valor("cumulative-layout-shift"),
    bytes: valor("total-byte-weight"),
  });
  console.error(`${pagina}: ok`);
}

mkdirSync("docs/medidas/dados", { recursive: true });
writeFileSync("docs/medidas/dados/lighthouse.json", JSON.stringify({ geradoEm: new Date().toISOString(), resultados }, null, 2));

const s = (ms) => (ms / 1000).toFixed(1);
console.log("| Página | Desempenho | Acessibilidade | Boas práticas | SEO | FCP (s) | LCP (s) | TBT (ms) | CLS | Peso total (KB) |");
console.log("|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|");
for (const r of resultados) {
  const n = r.notas;
  console.log(`| \`${r.pagina}\` | ${n.performance} | ${n.accessibility} | ${n["best-practices"]} | ${n.seo} | ${s(r.fcpMs)} | ${s(r.lcpMs)} | ${Math.round(r.tbtMs)} | ${r.cls.toFixed(3)} | ${Math.round(r.bytes / 1024)} |`);
}

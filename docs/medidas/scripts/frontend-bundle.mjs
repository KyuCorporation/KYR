// Mede o JavaScript e o CSS que cada página estática do frontend carrega, a partir
// do build de produção (rode `npm run build` em frontend/ antes). Não usa rede.
// Uso: node docs/medidas/scripts/frontend-bundle.mjs   (na raiz do repositório)
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";

const next = "frontend/.next";
const paginas = join(next, "server/app");
if (!existsSync(paginas)) {
  console.error("Build não encontrado. Rode `npm run build` em frontend/ antes.");
  process.exit(1);
}

const kb = (n) => (n / 1024).toFixed(1);
const tamanhos = (url) => {
  const arquivo = join(next, url.replace(/^\/_next\//, ""));
  if (!existsSync(arquivo)) return { bruto: 0, gzip: 0 };
  const conteudo = readFileSync(arquivo);
  return { bruto: conteudo.length, gzip: gzipSync(conteudo).length };
};

const htmls = [];
const varrer = (dir) => {
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) varrer(caminho);
    else if (nome.endsWith(".html") && !nome.startsWith("_")) htmls.push(caminho);
  }
};
varrer(paginas);

console.log("| Página | Arquivos JS | JS (KB) | JS gzip (KB) | CSS gzip (KB) |");
console.log("|---|---:|---:|---:|---:|");
for (const html of htmls.sort()) {
  const conteudo = readFileSync(html, "utf8");
  const scripts = new Set([...conteudo.matchAll(/(\/_next\/static\/[^"']+\.js)/g)].map((m) => m[1]));
  const estilos = new Set([...conteudo.matchAll(/(\/_next\/static\/[^"']+\.css)/g)].map((m) => m[1]));
  let js = 0, jsGz = 0, cssGz = 0;
  for (const s of scripts) { const t = tamanhos(s); js += t.bruto; jsGz += t.gzip; }
  for (const s of estilos) cssGz += tamanhos(s).gzip;
  const rota = "/" + html.slice(paginas.length + 1).replace(/\\/g, "/").replace(/\.html$/, "").replace(/^index$/, "");
  console.log(`| \`${rota}\` | ${scripts.size} | ${kb(js)} | ${kb(jsGz)} | ${kb(cssGz)} |`);
}

let total = 0;
const somar = (dir) => {
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) somar(caminho);
    else total += statSync(caminho).size;
  }
};
somar(join(next, "static"));
console.log(`\nTotal de arquivos estáticos gerados (.next/static): ${kb(total)} KB`);

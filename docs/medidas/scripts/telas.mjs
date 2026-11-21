// Captura as telas do KYR usadas no TCC, percorrendo o fluxo real: cadastro, painel,
// exploração, detalhe de destino, criação de roteiro com uma parada, resultado, salvar na
// conta e "Meus roteiros".
//
// Pré-requisitos: a aplicação completa rodando (frontend em produção, backend-core,
// ia-service e banco), puppeteer-core instalado fora do projeto e um Edge ou Chrome aberto
// com porta de depuração (o launch do Puppeteer falha no Windows):
//   msedge --headless=new --remote-debugging-port=9334 --user-data-dir=<pasta-temporária> about:blank
//   npm i --no-save puppeteer-core@24.10.0
//   node docs/medidas/scripts/telas.mjs http://localhost:3100 docs/medidas/telas
//
// ATENÇÃO: gera 1 roteiro real (até 8 buscas no Places, 1 rota e 1 ordenação no backend)
// e carrega o mapa 2 vezes. O autocomplete do Google é bloqueado: os campos usam as
// sugestões locais de criar-roteiro/mockPlaces.ts, que têm as mesmas coordenadas.
import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const [base = "http://localhost:3100", saida = "docs/medidas/telas", porta = "9334"] = process.argv.slice(2);
mkdirSync(saida, { recursive: true });

const browser = await puppeteer.connect({ browserURL: `http://127.0.0.1:${porta}`, defaultViewport: null });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1.5 });
await page.setRequestInterception(true);
page.on("request", (req) => (req.url().includes("places.googleapis.com") ? req.abort() : req.continue()));

const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const ir = (caminho) => page.goto(base + caminho, { waitUntil: "networkidle2", timeout: 60000 });
async function print(nome, antes = 1200) {
  await espera(antes);
  await page.screenshot({ path: join(saida, `${nome}.png`) });
  console.error(`ok ${nome}`);
}
async function escolher(id, texto) {
  await page.click(`#${id}`);
  await page.type(`#${id}`, texto, { delay: 40 });
  await page.waitForSelector(`#${id}-suggestions button`, { timeout: 10000 });
  await espera(600);
  await page.click(`#${id}-suggestions button`);
  await espera(300);
}
const botao = async (texto) => (await page.$$(`xpath/.//button[contains(., '${texto}')]`))[0];

await ir("/");
await print("tela-inicial");

// Conta fictícia, criada só para as capturas.
await ir("/cadastro");
const campos = await page.$$("form input");
await campos[0].type("Ana Viajante");
await campos[1].type(`ana.viajante.${Date.now()}@exemplo.com`);
await campos[2].type("senha-de-teste-123");
await Promise.all([page.waitForNavigation({ waitUntil: "networkidle2" }), page.click("form button[type=submit]")]);
await print("tela-painel", 2000);

await ir("/explorar");
await print("tela-explorar", 2000);
const href = await page.$eval('a[href^="/destinos/"]', (a) => a.getAttribute("href"));
await ir(href);
await print("tela-destino", 2000);

await ir("/criar-roteiro");
await escolher("origem", "Aeroporto");
await escolher("destino", "Grand Carim");
await (await botao("Adicionar parada")).click();
await espera(300);
await escolher("parada-0", "Marco das");
await page.evaluate(() => document.activeElement?.blur());
await print("tela-criar-roteiro", 6000);

const inicio = Date.now();
await (await botao("Gerar roteiro")).click();
await page.waitForFunction(() => location.pathname === "/roteiro/resultado", { timeout: 90000 });
console.error(`roteiro exibido ${Date.now() - inicio} ms depois do clique`);
await page.waitForNetworkIdle({ idleTime: 1500, timeout: 30000 }).catch(() => {});
await espera(4000);
// A lista rola dentro do painel: centraliza o cartão da parada do usuário.
await page.evaluate(() => {
  const selo = [...document.querySelectorAll("span")].find((s) => s.textContent === "Sua parada");
  (selo?.closest("li") ?? selo?.parentElement?.parentElement)?.scrollIntoView({ block: "center" });
});
await print("tela-resultado", 1500);

await (await botao("Salvar rota")).click();
await page.waitForFunction(() => document.body.innerText.includes("Salva na sua conta"), { timeout: 15000 }).catch(() => {});
await ir("/roteiros");
await print("tela-meus-roteiros", 2000);

await page.close();
browser.disconnect();

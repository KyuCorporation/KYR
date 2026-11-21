// Conta arquivos e linhas de código (não vazias) versionados no git, por módulo,
// separando código de produção e de teste. Não usa rede.
// Uso: node docs/medidas/scripts/tamanho-codigo.mjs   (na raiz do repositório)
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const arquivos = execSync("git ls-files", { encoding: "utf8" }).split("\n").filter(Boolean);

const extensoes = new Set([".java", ".ts", ".tsx", ".css", ".sql", ".mjs", ".js", ".yml", ".yaml", ".properties"]);
const ignorar = [/^frontend\/public\//, /package-lock\.json$/, /\.mvn\//, /next-env\.d\.ts$/];
const modulos = ["backend-core", "ia-service", "frontend"];

const ehTeste = (f) =>
  /\/src\/test\//.test(f) || /\.test\.(ts|tsx)$/.test(f) || /vitest\.config/.test(f);

const linhasNaoVazias = (f) =>
  readFileSync(f, "utf8").split(/\r?\n/).filter((l) => l.trim() !== "").length;

const resultado = {};
for (const f of arquivos) {
  const modulo = modulos.find((m) => f.startsWith(m + "/"));
  if (!modulo || ignorar.some((r) => r.test(f))) continue;
  const ext = f.slice(f.lastIndexOf("."));
  if (!extensoes.has(ext)) continue;
  const tipo = ehTeste(f) ? "teste" : "producao";
  const chave = `${modulo}|${tipo}|${ext}`;
  resultado[chave] ??= { arquivos: 0, linhas: 0 };
  resultado[chave].arquivos += 1;
  resultado[chave].linhas += linhasNaoVazias(f);
}

console.log("| Módulo | Tipo | Extensão | Arquivos | Linhas não vazias |");
console.log("|---|---|---|---:|---:|");
for (const [chave, v] of Object.entries(resultado).sort()) {
  const [m, t, e] = chave.split("|");
  console.log(`| ${m} | ${t} | ${e} | ${v.arquivos} | ${v.linhas} |`);
}

console.log("\n| Módulo | Linhas de produção | Linhas de teste | Teste / produção |");
console.log("|---|---:|---:|---:|");
for (const m of modulos) {
  const soma = (tipo) =>
    Object.entries(resultado)
      .filter(([k]) => k.startsWith(`${m}|${tipo}|`))
      .reduce((a, [, v]) => a + v.linhas, 0);
  const p = soma("producao");
  const t = soma("teste");
  console.log(`| ${m} | ${p} | ${t} | ${(t / p).toFixed(2)} |`);
}

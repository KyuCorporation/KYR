# Medidas do KYR

Medições automatizadas feitas em **20/11/2026** sobre o commit `0f21d1a` (`main`, merge do PR #65). Servem de base para a seção de resultados do TCC.

Todos os números abaixo saíram de scripts ou ferramentas, sem anotação manual. Os scripts estão em [`scripts/`](scripts/) e os dados brutos de cada execução em [`dados/`](dados/). As seções de 1 a 3 não usam rede e podem ser repetidas sem custo. As seções 4 e 5 chamam o LLM. A seção 5 também gasta cota do Google.

## Ambiente

| Item | Valor |
|---|---|
| Máquina | AMD Ryzen 7 5700X (8 núcleos), 32 GB de RAM, NVIDIA GeForce RTX 5060 |
| Sistema | Windows 10 Home 22H2 |
| Java | Temurin 25.0.5 (backend-core e ia-service) |
| Node.js | 22.23.4 |
| Banco | PostgreSQL 15 (`postgres:15-alpine`), criado vazio para a medição |
| LLM na nuvem | Gemini `gemini-3.5-flash-lite` |
| LLM local | Mistral 7B (`mistral:latest`) no Ollama 0.40.16, usando a GPU |
| Navegador | Microsoft Edge 157, sem interface |

Os serviços rodaram direto na máquina, a partir dos `.jar` e do build de produção, e não em Docker. Os tempos dependem da rede e da máquina. O que vale comparar são as proporções entre os cenários.

---

## 1. Tamanho do código

Linhas não vazias dos arquivos versionados no git ([`tamanho-codigo.mjs`](scripts/tamanho-codigo.mjs)).

| Módulo | Linhas de produção | Linhas de teste | Teste / produção |
|---|---:|---:|---:|
| backend-core (Java, SQL, YAML) | 1.790 | 1.246 | 0,70 |
| ia-service (Java, YAML) | 699 | 256 | 0,37 |
| frontend (TS, TSX, CSS) | 7.292 | 1.678 | 0,23 |
| **Total** | **9.781** | **3.180** | **0,33** |

Detalhe do frontend: 2.772 linhas em `.tsx`, 1.387 em `.ts` e 3.109 em `.css` (14 arquivos). O backend-core tem 60 classes Java de produção e 1 migration SQL. O ia-service tem 14 classes.

## 2. Testes automatizados

Os testes Java rodaram com `mvnw clean verify` numa cópia limpa do commit, sem os arquivos não versionados da pasta local. O frontend rodou com `vitest run`. Nenhum teste usa rede.

| Módulo | Classes / arquivos de teste | Testes | Passaram | Falharam | Pulados | Tempo dos testes | Tempo total do `verify` |
|---|---:|---:|---:|---:|---:|---:|---:|
| backend-core (JUnit 5) | 11 | 54 | 54 | 0 | 0 | 4,3 s | 14 s |
| ia-service (JUnit 5) | 5 | 16 | 15 | 0 | 1 | 3,7 s | 11 s |
| frontend (Vitest) | 22 | 125 | 125 | 0 | 0 | 12,6 s | – |
| **Total** | **38** | **195** | **194** | **0** | **1** | | |

A linha do frontend foi medida de novo em **21/11/2026**, no commit `9f5bbaa` (branch `test/frontend-cobertura`), depois da inclusão de 99 testes. Na medição de 20/11 eram 4 arquivos e 26 testes. As linhas de teste da seção 1 também foram recontadas nesse commit.

O teste pulado é o `CuradoriaServiceIntegrationTest`, que chama um LLM de verdade e só roda com `RUN_LLM_INTEGRATION_TESTS=1`. O lint do frontend (`eslint .`) terminou sem erros nem avisos.

### Cobertura de testes

A cobertura foi medida com JaCoCo 0.8.14 no Java e `@vitest/coverage-v8` no frontend. Os dois foram usados só durante a medição: nenhum `pom.xml` nem o `package.json` foi alterado.

| Módulo | Linhas cobertas | Desvios (branches) cobertos |
|---|---:|---:|
| backend-core | 59,6% (de 681 linhas executáveis) | 55,9% |
| ia-service | 66,8% (de 298) | 69,0% |
| frontend | 68,0% das instruções (era 11,3% em 20/11) | 86,8% (era 57,6%) |

Onde a cobertura está concentrada:

| Parte | Linhas cobertas |
|---|---:|
| backend-core, `poi.client` (clientes do Google Places e Directions) | 88,3% |
| backend-core, `poi.service` (busca de lugares ao longo da rota) | 84,7% |
| backend-core, `service` (montagem do roteiro, cache e ordenação) | 72,1% |
| backend-core, `conta` (login, roteiros salvos, avaliações) | 15,5% |
| ia-service, `curadoria` (cadeia de LLMs, prompt e leitura da resposta) | 90,9% |
| ia-service, `config` (montagem dos provedores) | 34,4% |
| frontend, `src/core` (chamada à API, sessão, roteiros salvos) | 97,9% (era 50,2%) |
| frontend, rotas de API em `src/app/api` (repasse ao backend e cookie da sessão) | 94,0% (era 0%) |
| frontend, `src/hooks` (Google Maps e autocomplete) | 96,9% |
| frontend, telas em `src/app` | 68,1% (era 0%) |
| frontend, `src/components` | 57,1% (era 15,9%) |

A regra de negócio (roteiro, curadoria, clientes do Google) tem boa cobertura. No frontend, o que falta são os dois mapas (`RoteiroMap` e `GoogleMapRoute`), que dependem do SDK do Google Maps no navegador, e as páginas sem lógica (layout, home, ajuda). No backend-core, a parte de contas quase não tem testes.

## 3. Frontend: build, tamanho e Lighthouse

### Build de produção

`npm run build` (Next.js 16.2.10, webpack) terminou em **44 s**: compilação em 11,9 s, checagem de TypeScript em 6,1 s, e 20 páginas geradas, das quais 13 estáticas e 7 rotas de API. O service worker do PWA (`/sw.js`) é gerado no build.

### JavaScript e CSS carregados por página

Medido a partir dos arquivos que cada página pré-renderizada referencia ([`frontend-bundle.mjs`](scripts/frontend-bundle.mjs)). O valor inclui o React e o Next.js, que são compartilhados por todas as páginas e ficam em cache no navegador depois da primeira visita.

| Página | Arquivos JS | JS (KB) | JS com gzip (KB) | CSS com gzip (KB) |
|---|---:|---:|---:|---:|
| `/inicio` | 11 | 612,6 | 190,5 | 9,2 |
| `/explorar` | 11 | 604,7 | 188,0 | 9,2 |
| `/favoritos` | 11 | 604,7 | 188,0 | 9,2 |
| `/roteiros` | 9 | 594,8 | 184,0 | 9,2 |
| `/criar-roteiro` | 7 | 589,8 | 180,8 | 6,4 |
| `/roteiro/resultado` | 8 | 569,0 | 177,4 | 5,0 |
| `/ajuda` | 8 | 573,3 | 176,8 | 9,2 |
| `/` | 8 | 555,9 | 173,1 | 6,0 |
| `/cadastro` | 7 | 549,7 | 171,0 | 4,6 |
| `/entrar` | 7 | 549,7 | 171,0 | 4,6 |

Os arquivos estáticos gerados somam 1.406 KB.

### Lighthouse

O Lighthouse 12.6.1 rodou na configuração padrão, que emula um celular numa rede 4G lenta, sobre o build de produção servido por `next start` ([`lighthouse.mjs`](scripts/lighthouse.mjs)). Notas de 0 a 100.

| Página | Desempenho | Acessibilidade | Boas práticas | SEO | FCP (s) | LCP (s) | TBT (ms) | CLS | Peso total (KB) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `/` | 98 | 95 | 100 | 100 | 0,9 | 2,4 | 18 | 0,000 | 308 |
| `/inicio` | 90 | 96 | 96 | 100 | 1,2 | 3,6 | 35 | 0,000 | 565 |
| `/criar-roteiro` | 98 | 95 | 96 | 100 | 1,2 | 2,2 | 105 | 0,000 | 492 |
| `/explorar` | 86 | 96 | 96 | 100 | 1,2 | 4,1 | 66 | 0,000 | 640 |
| `/roteiros` | 99 | 100 | 100 | 100 | 1,2 | 2,0 | 38 | 0,000 | 299 |
| `/favoritos` | 98 | 95 | 96 | 100 | 1,2 | 2,3 | 42 | 0,000 | 299 |
| `/entrar` | 98 | 100 | 100 | 100 | 1,2 | 2,2 | 58 | 0,000 | 264 |
| `/cadastro` | 98 | 100 | 100 | 100 | 1,2 | 2,2 | 54 | 0,000 | 264 |
| `/ajuda` | 99 | 100 | 100 | 100 | 1,2 | 1,8 | 41 | 0,012 | 300 |
| **Média** | **96** | **97** | **98** | **100** | | | | | |

Legenda: FCP é o primeiro conteúdo na tela, LCP é o maior elemento visível carregado, TBT é o tempo em que a página fica travada para interação e CLS mede quanto o layout se mexe durante o carregamento. As duas notas de desempenho mais baixas (`/explorar` e `/inicio`) estão nas páginas com mais imagens de destinos, que também são as mais pesadas.

O Lighthouse 12 não avalia mais PWA. Por isso, a verificação foi feita direto no servidor: `/manifest.json`, `/sw.js` e os ícones de 192 e 512 px respondem 200. O manifesto declara nome "Kyr - Know Your Route", `display: standalone` e `start_url: /`.

---

## 4. Curadoria por IA comparada com a curadoria manual

O [`curadoria-ia.mjs`](scripts/curadoria-ia.mjs) envia ao `POST /curar-roteiro` do ia-service os 18 lugares de [`dataset-pois-foz.json`](../dataset-pois-foz.json), em dois lotes (10 e 8), porque o backend-core manda no máximo 10 lugares por vez. Depois compara a trilha e o tipo devolvidos pela IA com os da curadoria manual do dataset. Cada cenário teve 3 rodadas, ou seja, 6 chamadas e 54 classificações.

O ia-service recebe só o nome e a categoria. Como o dataset não guarda a categoria do Google, todos os lugares foram com a categoria genérica `ponto_de_interesse`. A IA classificou só pelo nome, então a concordância medida tende a ficar **abaixo** da que se teria no uso real.

Para cada cenário, a cadeia de provedores foi montada de um jeito diferente (quatro instâncias do ia-service com variáveis de ambiente diferentes):

| Cenário | Cadeia configurada | Modelo que respondeu | Latência mín / mediana / máx (ms) | Lugares curados | Trilha igual à manual | Tipo igual ao manual | Trilha e tipo iguais | Descrição média (caracteres) | Descrições dentro do limite de 300 |
|---|---|---|---|---:|---:|---:|---:|---:|---:|
| Normal | Gemini → Mistral local | Gemini (6×) | 1.971 / 2.351 / 3.391 | 100% (54/54) | 100% | 88,9% | 88,9% | 140 | 100% |
| Gemini fora do ar | Gemini com chave inválida → Mistral local | Mistral (4×), nenhum (2×) | 6.826 / 9.121 / 13.799 | 63,0% (34/54) | 70,6% | 91,2% | 67,6% | 74 | 100% |
| Só o modelo local | Mistral local | Mistral (6×) | 7.381 / 10.546 / 11.586 | 83,3% (45/54) | 75,6% | 93,3% | 75,6% | 81 | 100% |
| Nenhum LLM disponível | Gemini com chave inválida, sem Mistral | nenhum (6×) | 186 / 234 / 572 | 0% | – | – | – | – | – |

As porcentagens de concordância são calculadas sobre os lugares que a IA curou.

O que a tabela mostra:

- **Gemini.** Curou todos os lugares e acertou a trilha (turismo ou compras) em 100% dos casos. As únicas divergências se repetiram nas 3 rodadas, sempre nos mesmos 2 lugares: *Empório com Arte* e *ODA Vinhoteca Duty Free*, que a curadoria manual classifica como compras/alimentação e o Gemini como compras/lazer. São lojas que vendem comida e bebida, um caso ambíguo.
- **Mistral local.** É de 4 a 5 vezes mais lento, cura menos lugares e erra mais a trilha. Ele tende a chamar de "turismo" lugares que a curadoria manual considera de compras, como *Supermercado Ítalo*, *Três Fronteiras Artesanato* e *Cataratas Souvenirs*. Suas descrições têm cerca de metade do tamanho das do Gemini.
- **Falha do Gemini.** Quando o Gemini falha, a cadeia passa para o próximo provedor sem erro para o usuário. A latência sobe de cerca de 2 s para cerca de 9 s.
- **Sem nenhum LLM.** O serviço responde em menos de 1 s, devolve os lugares sem classificação e não retorna erro. Essa é a degradação esperada.

---

## 5. Roteiros de ponta a ponta (Google Maps e Gemini de verdade)

O [`roteiros-e2e.mjs`](scripts/roteiros-e2e.mjs) chamou o `POST /roteiros` do backend-core com o Google Maps real e o ia-service com a cadeia normal (Gemini → Mistral). O banco foi criado vazio, então o primeiro roteiro começou com o cache de curadoria zerado. Todos os roteiros vão do Aeroporto Internacional de Foz do Iguaçu ao Grand Carimã Resort & Convention Center. O "tempo no servidor" é o `metadados.tempoRespostaMs` devolvido pela API.

| Cenário | Status | Tempo no cliente (ms) | Tempo no servidor (ms) | Lugares sugeridos | Curados pela IA | Lugares enviados à IA | Ordem da rota | Distância (km) | Duração (min) |
|---|---:|---:|---:|---:|---:|---:|---|---:|---:|
| Carro, sem paradas (cache vazio) | 200 | 8.297 | 8.142 | 10 | 10 | 10 | otimizada pelo Google | 20,7 | 29 |
| Carro, mesma rota repetida | 200 | 2.584 | 2.576 | 10 | 10 | 0 | otimizada pelo Google | 20,7 | 29 |
| A pé | 200 | 3.679 | 3.672 | 10 | 10 | 3 | otimizada pelo Google | 10,1 | 134 |
| Bicicleta | 200 | 3.770 | 3.765 | 10 | 10 | 2 | otimizada pelo Google | 15,9 | 63 |
| Transporte público | 200 | 1.708 | 1.703 | 10 | 10 | 0 | sem otimização | – | – |
| Carro, com 2 paradas (Parque das Aves e Marco das Três Fronteiras) | 200 | 5.596 | 5.591 | 10 + 2 paradas | 10 | 9 | otimizada pelo Google | 33,8 | 65 |

A coluna "Lugares enviados à IA" saiu da tabela `curadoria_poi` do banco: conta quantas curadorias novas foram gravadas em cada roteiro. Os outros lugares vieram do cache.

Distância e duração são a soma dos trechos entre os pontos, na ordem sugerida, no meio de transporte escolhido.

O que a tabela mostra:

- **Cache de curadoria.** Nos 6 roteiros, a IA classificou só 24 lugares diferentes. As outras 36 das 60 sugestões (60%) vieram do cache. Repetir a mesma rota derrubou o tempo de 8,1 s para 2,6 s (−68%), sem chamar a IA nenhuma vez. Na rota a pé e na de bicicleta, 7 e 8 dos 10 lugares já estavam no cache.
- **Curadoria.** Todos os 60 lugares sugeridos voltaram curados pelo Gemini.
- **Transporte público.** A Directions não aceita pontos intermediários nesse modo. O backend busca os lugares pela rota de carro e devolve a lista sem otimizar a ordem e sem os trechos. Esse é o comportamento previsto (`fonteRota = fallback-sem-otimizacao`).
- **Validação.** Requisições inválidas são recusadas pelo backend antes de chegar ao Google:

| Requisição inválida | Status | Tempo (ms) |
|---|---:|---:|
| Sem origem | 400 | 20 |
| Latitude ausente no destino | 400 | 6 |
| 9 paradas (o limite é 8) | 400 | 8 |
| Meio de transporte desconhecido | 400 | 6 |

Distribuição dos 60 lugares sugeridos: turismo/alimentação 45 (75%), turismo/lazer 12 (20%), compras/alimentação 2 e compras/lazer 1. Descrições com 109 caracteres em média e 144 no máximo, todas dentro do limite de 300.

Gasto no Google nesta seção, no máximo: 48 buscas no Places, 6 buscas de rota, 5 ordenações e 1 carregamento de mapa (o do Lighthouse em `/criar-roteiro`). Tudo dentro da franquia gratuita de novembro, sem custo em dinheiro.

### Inicialização dos serviços

| Serviço | Tempo até aceitar requisições |
|---|---:|
| backend-core (inclui a migration do Flyway no banco vazio, que levou 0,05 s) | 4,5 s |
| ia-service (média de 4 instâncias) | 5,9 s |

## 6. Capturas de tela para o TCC

As figuras da seção de resultados do TCC foram capturadas em 20/11/2026 com o Edge sem interface, percorrendo o fluxo real com uma conta fictícia ([`telas.mjs`](scripts/telas.mjs)). O banco foi criado vazio e a cadeia era Gemini → Mistral. Três roteiros saíram dessa rodada:

| Execução | Tempo até exibir | Quem curou | Observação |
|---|---:|---|---|
| Criar roteiro com 1 parada (Marco), cache vazio | 9,4 s | Gemini | 11 pontos, com a parada marcada como "Sua parada" |
| Reabrir o roteiro salvo em "Meus roteiros" | 32,9 s | Mistral | O Gemini estourou o timeout de 8 s e a cadeia passou ao Mistral. O roteiro voltou **sem a parada**, com outra lista de lugares e com o próprio destino (Grand Carimã) entre as sugestões |
| Criar o mesmo roteiro de novo | 4,1 s | Gemini (e cache) | 11 pontos, usado na figura do resultado |

`telas.mjs` junta os três scripts usados nessa rodada, mas não foi executado de novo depois de reunido.

---

## Observações que as medições revelaram

Estes são pontos para o texto do TCC ou para trabalhos futuros. Nenhum deles foi corrigido na tarefa das medições; o item 4 foi tratado depois.

1. **O Mistral local às vezes devolve o JSON sem a chave `pontos`.** Ele manda o objeto do lugar direto. O leitor da resposta recusa esse formato, e aquele lote fica sem curadoria. É a causa das linhas "nenhum" nos cenários com o Mistral, conforme o log do ia-service: `campo "pontos" ausente ou não é uma lista`. Aceitar esse formato no `LlmResponseParser` aumentaria a taxa de curadoria do modelo local.
2. **A resposta não diz quando a curadoria veio do cache.** No roteiro repetido, `fonteIA` continua `gemini-3.5-flash-lite`, que é o modelo que curou originalmente. Só o banco mostra que a IA não foi chamada. Um campo como `metadados.curadosDoCache` deixaria isso visível.
3. **Muitas sugestões ficam dentro do próprio aeroporto.** Saindo do aeroporto, 75% das sugestões são de alimentação, algumas na área de embarque. Exemplo: *Living HNK - Embarque Foz do Iguaçu*, que quem acabou de desembarcar não consegue acessar.
4. **O frontend tinha pouca cobertura de testes nas telas** (0% em `src/app` em 20/11). Resolvido em 21/11 com os testes da branch `test/frontend-cobertura` (seção 2). Os mapas continuam sem testes.
5. **Reabrir um roteiro salvo perde as paradas e pode trazer o destino como sugestão** (seção 6). As sugestões também mudam, porque o roteiro é gerado de novo.

## O que não foi medido

- Tamanho das imagens Docker e tempo de build delas: exige buildar as três imagens de produção.
- Carga e concorrência (várias pessoas ao mesmo tempo).
- O ambiente publicado no Render, inclusive o tempo de acordar do plano gratuito, que o README estima em cerca de 50 s.
- Claude e OpenAI na cadeia de LLMs: não há chave configurada.
- Testes com usuários reais (usabilidade, satisfação): não são automatizáveis.

## Como repetir

Rode tudo na raiz do repositório.

```bash
# Sem rede e sem custo
node docs/medidas/scripts/tamanho-codigo.mjs
(cd backend-core && ./mvnw clean verify)        # JAVA_HOME apontando para um JDK 25
(cd ia-service && ./mvnw clean verify)
(cd frontend && npx vitest run && npm run build)
node docs/medidas/scripts/frontend-bundle.mjs

# Cobertura (sem alterar pom.xml nem package.json)
./mvnw org.jacoco:jacoco-maven-plugin:0.8.14:prepare-agent verify org.jacoco:jacoco-maven-plugin:0.8.14:report
npm i --no-save @vitest/coverage-v8@3.2.4 && npx vitest run --coverage

# Lighthouse (frontend em produção com `npx next start -p 3100`)
node docs/medidas/scripts/lighthouse.mjs http://localhost:3100 "<caminho do Chrome ou Edge>"

# Curadoria (chama o LLM; não chama o Google)
node docs/medidas/scripts/curadoria-ia.mjs http://localhost:8000 gemini 3

# Ponta a ponta (gasta cota do Google: registre em controle-cota-google.md)
node docs/medidas/scripts/roteiros-e2e.mjs http://localhost:8080
```

Para o cenário de cache vazio, suba o backend-core com um banco novo. Para os cenários da seção 4, suba o ia-service com as variáveis de cada linha da tabela: `GEMINI_API_KEY` vazia ou inválida, `OLLAMA_ENABLED=true` ou ausente.

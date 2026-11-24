# Medidas do KYR

Medições automatizadas feitas em **23/11/2026** na branch `fix/revisao-geral`, sobre o commit `63cb70d` da `main`, com as mudanças da revisão geral (limites de uso, segredo entre serviços, tempo total da cadeia de LLMs, prompt sem cidade fixa, total do percurso). As mudanças ainda não tinham commit no momento da medição. As medidas anteriores, de 20/11 (commit `0f21d1a`), estão no histórico do git. Servem de base para a seção de resultados do TCC.

As primeiras medições do dia usaram o limite de 8 s por provedor comercial. Como o Gemini passou desse limite na maior parte das chamadas da cadeia normal (seção 4), o padrão subiu para **15 s** (`LLM_TIMEOUT_SECONDS`). A curadoria na cadeia normal e a série de roteiros foram medidas de novo com o novo limite, e as tabelas principais das seções 4 e 5 são dessa medição. Os resultados com 8 s ficam registrados como medições preliminares. Os testes (seção 2) foram medidos de novo depois que os 11 arquivos de teste antigos do backend-core passaram a ser versionados.

Todos os números abaixo saíram de scripts ou ferramentas, sem anotação manual. Os scripts estão em [`scripts/`](scripts/) e os dados brutos de cada execução em [`dados/`](dados/). As seções de 1 a 3 não usam rede e podem ser repetidas sem custo. As seções 4 e 5 chamam o LLM. As seções 5 e 6 também gastam cota do Google.

## Ambiente

| Item | Valor |
|---|---|
| Máquina | AMD Ryzen 7 5700X (8 núcleos), 32 GB de RAM, NVIDIA GeForce RTX 5060 |
| Sistema | Windows 10 Home 22H2 |
| Java | Temurin 25.0.5 (backend-core e ia-service) |
| Node.js | 22.23.4 |
| Banco | PostgreSQL 15 (`postgres:15-alpine`, em contêiner), criado vazio para cada série de roteiros |
| LLM na nuvem | Gemini `gemini-3.5-flash-lite` |
| LLM local | Mistral 7B (`mistral:latest`) no Ollama 0.40.17, usando a GPU |
| Navegador | Microsoft Edge 158, sem interface |

Os serviços rodaram direto na máquina, a partir dos `.jar` e do build de produção, e não em Docker. As quatro instâncias do ia-service (seção 4), o backend-core, o Ollama e o frontend ficaram de pé ao mesmo tempo. Os tempos dependem da rede, da máquina e do provedor do LLM. O que vale comparar são as proporções entre os cenários.

---

## 1. Tamanho do código

Linhas não vazias dos arquivos versionados no git ([`tamanho-codigo.mjs`](scripts/tamanho-codigo.mjs)), já com os testes antigos do backend-core versionados.

| Módulo | Linhas de produção | Linhas de teste | Teste / produção |
|---|---:|---:|---:|
| backend-core (Java, SQL, YAML) | 2.303 | 2.758 | 1,20 |
| ia-service (Java, YAML) | 784 | 403 | 0,51 |
| frontend (TS, TSX, CSS, MJS) | 8.126 | 2.374 | 0,29 |
| **Total** | **11.213** | **5.535** | **0,49** |

Detalhe do frontend: 3.210 linhas em `.tsx`, 1.523 em `.ts`, 3.369 em `.css` (16 arquivos) e 24 em `.mjs`. O backend-core tem 64 classes Java de produção e 1 migration SQL. O ia-service tem 15 classes.

## 2. Testes automatizados

Os testes Java rodaram com `mvnw package` e o JaCoCo, já com os 11 arquivos de teste antigos do backend-core versionados. O frontend rodou com `vitest run`.

Nenhum teste chama serviço externo: Google Maps, ia-service e provedores de LLM são simulados. Os testes de acesso a dados do backend-core usam um PostgreSQL 15 em contêiner (Testcontainers), com as migrações reais do Flyway; sem Docker, eles são pulados. Nesta medição o Docker estava ativo, e todos rodaram.

| Módulo | Classes / arquivos de teste | Testes | Passaram | Falharam | Pulados | Tempo total |
|---|---:|---:|---:|---:|---:|---:|
| backend-core (JUnit 5) | 31 | 140 | 140 | 0 | 0 | 30 s (`package` com JaCoCo) |
| ia-service (JUnit 5) | 8 | 27 | 26 | 0 | 1 | 14 s (`package` com JaCoCo) |
| frontend (Vitest) | 26 | 175 | 175 | 0 | 0 | 24 s (com cobertura) |
| **Total** | **65** | **342** | **341** | **0** | **1** | |

O teste pulado é o `CuradoriaServiceIntegrationTest`, que chama um LLM de verdade e só roda com `RUN_LLM_INTEGRATION_TESTS=1`. O lint do frontend (`eslint .`) e a checagem de tipos (`tsc --noEmit`) terminaram sem erros nem avisos.

### Cobertura de testes

A cobertura foi medida com JaCoCo 0.8.14 no Java e `@vitest/coverage-v8` no frontend, sem alterar nenhum `pom.xml` nem o `package.json`.

| Módulo | Linhas cobertas | Desvios (branches) cobertos |
|---|---:|---:|
| backend-core | 96,2% (de 892 linhas executáveis) | 80,3% |
| ia-service | 91,4% (de 326) | 78,5% |
| frontend | 81,4% das instruções | 88,1% |

Onde a cobertura está concentrada:

| Parte | Linhas cobertas |
|---|---:|
| backend-core, `service` (montagem do roteiro, cache, ordenação e limite de roteiros) | 100% |
| backend-core, `controller` (`POST /roteiros`) | 100% |
| backend-core, `conta` (login, limites, IP do cliente, roteiros salvos, avaliações, LGPD) | 97,4% |
| backend-core, `iaservice.config` (cliente do ia-service e segredo compartilhado) | 94,1% |
| backend-core, `poi.client` (clientes do Google Places e Directions) | 88,3% |
| backend-core, `poi.service` (busca de lugares ao longo da rota) | 86,5% |
| ia-service, `web` (endpoint e filtro do segredo) | 94,7% |
| ia-service, `config` (montagem dos provedores) | 93,0% |
| ia-service, `curadoria` (cadeia de LLMs, prompt e leitura da resposta) | 91,3% |
| frontend, `src/core` (chamada à API, sessão, roteiros salvos) | 97,8% |
| frontend, `src/hooks` (Google Maps e autocomplete) | 97,6% |
| frontend, `src/components` (inclui os dois mapas) | 95,7% |
| frontend, rotas de API em `src/app/api` (repasse ao backend, IP do cliente e cookie da sessão) | 95,2% |
| frontend, telas em `src/app` | 77,7% |

O que ainda não tem teste no frontend são as páginas sem lógica (layout, início, ajuda) e a tela de demonstração `/roteiro`, que só responde em desenvolvimento.

## 3. Frontend: build, tamanho e Lighthouse

### Build de produção

`npm run build` (Next.js 16.2.10, webpack) terminou em **42 s**: compilação em 10,1 s e checagem de TypeScript em 7,0 s. Foram geradas 25 rotas, 14 estáticas e 11 dinâmicas (rotas de API e páginas com parâmetro). O service worker do PWA (`/sw.js`) é gerado no build.

### JavaScript e CSS carregados por página

Medido a partir dos arquivos que cada página pré-renderizada referencia ([`frontend-bundle.mjs`](scripts/frontend-bundle.mjs)). O valor inclui o React e o Next.js, que são compartilhados por todas as páginas e ficam em cache no navegador depois da primeira visita.

| Página | Arquivos JS | JS (KB) | JS com gzip (KB) | CSS com gzip (KB) |
|---|---:|---:|---:|---:|
| `/inicio` | 11 | 613,5 | 190,7 | 9,6 |
| `/explorar` | 11 | 605,6 | 188,3 | 9,6 |
| `/favoritos` | 11 | 605,6 | 188,3 | 9,6 |
| `/roteiros` | 9 | 595,9 | 184,3 | 9,6 |
| `/criar-roteiro` | 7 | 590,5 | 181,0 | 6,5 |
| `/conta` | 8 | 580,0 | 178,8 | 9,6 |
| `/roteiro/resultado` | 8 | 570,3 | 177,8 | 5,0 |
| `/ajuda` | 8 | 574,2 | 177,0 | 9,6 |
| `/privacidade` | 8 | 574,2 | 177,0 | 10,2 |
| `/` | 8 | 555,9 | 173,1 | 6,0 |
| `/cadastro` | 8 | 551,0 | 171,4 | 4,7 |
| `/entrar` | 8 | 551,0 | 171,4 | 4,7 |

Os arquivos estáticos gerados somam 1.428,5 KB.

### Lighthouse

O Lighthouse 12.6.1 rodou na configuração padrão, que emula um celular numa rede 4G lenta, sobre o build de produção servido por `next start` ([`lighthouse.mjs`](scripts/lighthouse.mjs)). Notas de 0 a 100.

| Página | Desempenho | Acessibilidade | Boas práticas | SEO | FCP (s) | LCP (s) | TBT (ms) | CLS | Peso total (KB) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `/` | 96 | 95 | 100 | 100 | 1,2 | 2,8 | 86 | 0,000 | 282 |
| `/inicio` | 83 | 96 | 96 | 100 | 1,2 | 4,5 | 112 | 0,000 | 567 |
| `/criar-roteiro` | 98 | 95 | 100 | 100 | 1,2 | 2,2 | 63 | 0,000 | 338 |
| `/explorar` | 94 | 96 | 96 | 100 | 1,2 | 3,0 | 28 | 0,000 | 633 |
| `/roteiros` | 93 | 100 | 100 | 100 | 1,7 | 3,2 | 48 | 0,000 | 295 |
| `/favoritos` | 98 | 95 | 96 | 100 | 1,2 | 2,4 | 44 | 0,000 | 301 |
| `/entrar` | 98 | 100 | 100 | 100 | 1,2 | 2,2 | 52 | 0,000 | 266 |
| `/cadastro` | 96 | 100 | 100 | 100 | 1,7 | 2,7 | 48 | 0,000 | 276 |
| `/ajuda` | 95 | 100 | 100 | 100 | 1,7 | 2,9 | 54 | 0,000 | 306 |
| **Média** | **95** | **97** | **99** | **100** | | | | | |

Legenda: FCP é o primeiro conteúdo na tela, LCP é o maior elemento visível carregado, TBT é o tempo em que a página fica travada para interação e CLS mede quanto o layout se mexe durante o carregamento. A nota de desempenho mais baixa (`/inicio`) está na página com mais imagens de destinos. A máquina rodava ao mesmo tempo cinco JVMs e o Ollama, o que pesa no TBT; as notas variam alguns pontos entre execuções.

O Lighthouse 12 não avalia mais PWA. Os arquivos que permitem instalar a aplicação (`/manifest.json`, `/sw.js` e ícones de 192 e 512 px) continuam no build.

---

## 4. Curadoria por IA comparada com a curadoria manual

O [`curadoria-ia.mjs`](scripts/curadoria-ia.mjs) envia ao `POST /curar-roteiro` do ia-service os 18 lugares de [`dataset-pois-foz.json`](../dataset-pois-foz.json), em dois lotes (10 e 8), porque o backend-core manda no máximo 10 lugares por vez. Depois compara a trilha e o tipo devolvidos pela IA com os da curadoria manual do dataset. Cada cenário teve 3 rodadas, ou seja, 6 chamadas e 54 classificações.

O ia-service recebe só o nome e a categoria. Como o dataset não guarda a categoria do Google, todos os lugares foram com a categoria genérica `ponto_de_interesse`. A IA classificou só pelo nome, então a concordância medida pode diferir da que se teria no uso real, em que a categoria é enviada. O prompt é o atual, que não cita cidade nem evento.

Para cada cenário, o ia-service foi iniciado com variáveis de ambiente diferentes, com os limites padrão: 15 s para o Gemini e 30 s para o Mistral. Nos três últimos cenários o limite do Gemini não pesa, porque ele falha na hora (chave inválida) ou não está na cadeia; esses cenários foram medidos com o limite antigo de 8 s e não foram repetidos.

| Cenário | Cadeia configurada | Modelo que respondeu | Latência mín / mediana / máx (ms) | Lugares curados | Trilha igual à manual | Tipo igual ao manual | Trilha e tipo iguais | Descrição média (caracteres) | Descrições dentro do limite de 300 |
|---|---|---|---|---:|---:|---:|---:|---:|---:|
| Normal | Gemini (15 s) → Mistral local | Gemini (6×) | 2.167 / 3.255 / 3.753 | 100% (54/54) | 100% | 92,6% | 92,6% | 120 | 100% |
| Gemini fora do ar | Gemini com chave inválida → Mistral local | Mistral (6×) | 6.200 / 8.808 / 10.127 | 74,1% (40/54) | 67,5% | 80,0% | 55,0% | 61 | 100% |
| Só o modelo local | Mistral local | Mistral (6×) | 6.083 / 9.131 / 9.505 | 85,2% (46/54) | 65,2% | 76,1% | 47,8% | 56 | 100% |
| Nenhum LLM disponível | Gemini com chave inválida, sem Mistral | nenhum (6×) | 176 / 575 / 703 | 0% | – | – | – | – | – |

As porcentagens de concordância são calculadas sobre os lugares que a IA curou.

Medições preliminares, com o limite antigo de 8 s ([`curadoria-gemini-limite-8s.json`](dados/curadoria-gemini-limite-8s.json)) e com o Gemini sozinho e 30 s de limite ([`curadoria-gemini-limite-30s.json`](dados/curadoria-gemini-limite-30s.json)):

| Cenário | Modelo que respondeu | Latência mín / mediana / máx (ms) | Lugares curados | Trilha igual | Tipo igual | Trilha e tipo iguais |
|---|---|---|---:|---:|---:|---:|
| Normal, Gemini com 8 s → Mistral | Mistral (4×), Gemini (1×), nenhum (1×) | 5.521 / 19.979 / 33.649 | 72,2% (39/54) | 71,8% | 79,5% | 59,0% |
| Só o Gemini, 30 s | Gemini (6×) | 1.880 / 3.258 / 6.299 | 100% (54/54) | 100% | 90,7% | 90,7% |

O que as tabelas mostram:

- **Gemini.** Curou todos os lugares e acertou a trilha em 100% dos casos. As únicas divergências foram as mesmas de 20/11: *ODA Vinhoteca Duty Free* (3×) e *Empório com Arte* (1×; 2× na medição preliminar), que a curadoria manual classifica como compras/alimentação e o Gemini como compras/lazer. São lojas que vendem comida e bebida, um caso ambíguo. A concordância ficou em 92,6% (90,7% na preliminar), contra 88,9% com o prompt antigo.
- **Latência do Gemini e o limite de tempo.** Na medição com 15 s, os lotes levaram de 2,2 s a 3,8 s, e a reserva não foi acionada. Nas preliminares, a latência variou de 1,9 s a 10,7 s por lote (incluindo uma rodada de diagnóstico, não registrada na tabela), e os lotes de 10 lugares passaram dos 8 s em 5 de 6 chamadas da cadeia normal, que então caiu no Mistral. Em 20/11, com o mesmo modelo, a mediana foi de 2,4 s. Foi isso que levou o limite a 15 s.
- **Mistral local.** É cerca de 3 vezes mais lento que o Gemini (medianas de 8,8 s e 9,1 s, contra 3,3 s), cura menos lugares e concorda bem menos que antes: 47,8% em trilha e tipo, contra 75,6% com o prompt antigo. Ele tende a chamar de "turismo" lugares de compras (*Supermercado Ítalo*, *Três Fronteiras Artesanato*, *Cataratas Souvenirs*) e de "compras" restaurantes (*Rafain Churrascaria Show*, *Cantina da Bea*, *V8 Garagem Bar*). O prompt antigo dizia que os lugares estavam no trajeto do aeroporto de Foz do Iguaçu ao local do evento; sem esse contexto, o modelo local perdeu mais do que o Gemini.
- **Falha do Gemini.** Com a chave inválida, a cadeia passa para o Mistral sem erro para o usuário, com latência de cerca de 9 s.
- **Sem nenhum LLM.** O serviço responde em menos de 1 s, devolve os lugares sem classificação e não retorna erro. Essa é a degradação esperada.
- **Respostas fora do formato.** Na cadeia normal preliminar, um lote ficou sem curadoria porque o Gemini estourou os 8 s e o Mistral devolveu o lugar direto, sem a lista `pontos`.

---

## 5. Roteiros de ponta a ponta (Google Maps e Gemini de verdade)

O [`roteiros-e2e.mjs`](scripts/roteiros-e2e.mjs) chamou o `POST /roteiros` do backend-core com o Google Maps real e o ia-service com a cadeia normal (Gemini com limite de 15 s → Mistral). A série começou com o banco vazio, ou seja, com o cache de curadoria zerado. Todos os roteiros vão do Aeroporto Internacional de Foz do Iguaçu ao Grand Carimã Resort & Convention Center. O "tempo no servidor" é o `metadados.tempoRespostaMs` devolvido pela API.

A tabela é da execução 3 ([`roteiros-e2e-execucao3.json`](dados/roteiros-e2e-execucao3.json)), já com o limite de 15 s. Antes, com o limite de 8 s, a série rodou duas vezes:
- Na execução 1 ([`roteiros-e2e-execucao1.json`](dados/roteiros-e2e-execucao1.json)), o primeiro roteiro saiu **sem curadoria**, em 25,7 s. O Gemini passou dos 8 s e o Mistral respondeu fora do formato, então a cadeia inteira falhou, como previsto. Como nada foi guardado no cache, essa execução não mediu o efeito do cache.
- Na execução 2 ([`roteiros-e2e-execucao2.json`](dados/roteiros-e2e-execucao2.json)), tudo foi curado pelo Gemini, com 7,3 s no primeiro roteiro e 2,0 s na repetição.

| Cenário | Status | Tempo no cliente (ms) | Tempo no servidor (ms) | Lugares sugeridos | Curados pela IA | Lugares enviados à IA | Ordem da rota | Distância total (km) | Duração total (min) | Distância até o último ponto (km) |
|---|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|
| Carro, sem paradas (cache vazio) | 200 | 19.710 | 19.512 | 10 | 10 | 10 | otimizada pelo Google | 22,4 | 33 | 20,7 |
| Carro, mesma rota repetida | 200 | 4.265 | 4.258 | 10 | 10 | 0 | otimizada pelo Google | 22,4 | 33 | 20,7 |
| A pé | 200 | 4.566 | 4.558 | 10 | 10 | 3 | otimizada pelo Google | 11,3 | 151 | 10,1 |
| Bicicleta | 200 | 3.866 | 3.860 | 10 | 10 | 2 | otimizada pelo Google | 17,1 | 75 | 15,9 |
| Transporte público | 200 | 2.260 | 2.254 | 10 | 10 | 0 | sem otimização | – | – | – |
| Carro, com 2 paradas (Parque das Aves e Marco das Três Fronteiras) | 200 | 7.224 | 7.217 | 10 + 2 paradas | 10 | 9 | otimizada pelo Google | 35,1 | 69 | 33,8 |

"Lugares enviados à IA" conta os lugares que não tinham aparecido em roteiros anteriores da série; os demais vieram do cache. A distância e a duração totais vêm de `metadados.distanciaTotalMetros` e `metadados.duracaoTotalSegundos` e incluem o trecho do último ponto até o destino. A última coluna soma só os trechos de cada ponto, como nas medições de 20/11 (que mediram 20,7, 10,1, 15,9 e 33,8 km nos mesmos cenários).

O que a tabela mostra:

- **Cache de curadoria.** Nos 6 roteiros, a IA classificou só 24 lugares diferentes. As outras 36 das 60 sugestões (60%) vieram do cache. Repetir a mesma rota derrubou o tempo de 19,5 s para 4,3 s (−78%), sem chamar a IA. Como as duas requisições fazem as mesmas consultas ao Google, a diferença está na curadoria e nas primeiras conexões aos serviços externos. Na rota a pé e na de bicicleta, 7 e 8 dos 10 lugares já estavam no cache. As contagens são idênticas às da execução 2.
- **Variação dos tempos.** O mesmo cenário levou 7,3 s na execução 2 e 19,5 s na 3, e a repetição, 2,0 s e 4,3 s. Os tempos do Google e do Gemini variam bastante entre execuções; o que se repete é a proporção do ganho do cache.
- **Curadoria.** Na execução 3, todos os 60 lugares sugeridos voltaram curados pelo Gemini, sem acionar a reserva. Na execução 1, além do roteiro sem curadoria, o de bicicleta foi curado pelo Mistral (9 de 10 lugares).
- **Trecho final.** O trecho do último ponto até o destino acrescenta de 1,2 a 1,7 km ao percurso. A tela de resultado passou a mostrar o total completo.
- **Transporte público.** A Directions não aceita pontos intermediários nesse modo. O backend busca os lugares pela rota de carro e devolve a lista sem otimizar a ordem e sem os trechos. Esse é o comportamento previsto (`fonteRota = fallback-sem-otimizacao`).
- **Validação.** Requisições inválidas são recusadas pelo backend antes de chegar ao Google, com `{ codigo, mensagem }`:

| Requisição inválida | Status | Tempo (ms) | Mensagem |
|---|---:|---:|---|
| Sem origem | 400 | 11 | origem é obrigatória |
| Latitude ausente no destino | 400 | 4 | latitude é obrigatória |
| 9 paradas (o limite é 8) | 400 | 6 | um roteiro tem no máximo 8 paradas |
| Meio de transporte desconhecido | 400 | 5 | O corpo da requisição tem um formato inválido. |

Distribuição dos 60 lugares sugeridos na execução 3: turismo/alimentação 45 (75%), turismo/lazer 12 (20%), compras/alimentação 2 e compras/lazer 1, a mesma da execução 2 e de 20/11. Descrições com 101 caracteres em média e 145 no máximo, todas dentro do limite de 300.

O limite de uso (10 roteiros por IP por hora e 30 por dia) ficou ativo, mas as séries não chegaram a ele. O 429 é coberto pelos testes automatizados.

Gasto no Google nesta seção, no máximo: 144 buscas no Places, 18 buscas de rota e 15 ordenações nas três execuções. Tudo dentro da franquia gratuita de novembro, sem custo em dinheiro.

### Inicialização dos serviços

| Serviço | Tempo até aceitar requisições |
|---|---:|
| backend-core, sozinho (inclui a migration do Flyway no banco vazio, que levou 0,09 s) | 5,6 s |
| ia-service (média de 4 instâncias iniciadas ao mesmo tempo que o backend-core) | 8,2 s |

## 6. Capturas de tela para o TCC

As figuras de criar roteiro e de resultado do TCC foram capturadas de novo com o Edge sem interface, percorrendo o fluxo real com uma conta fictícia ([`telas.mjs`](scripts/telas.mjs)), depois da série 2 da seção 5 (cache já preenchido). O autocomplete do Google foi bloqueado; os campos usam as sugestões locais, que têm as mesmas coordenadas.

| Execução | Tempo até exibir | Quem curou | Observação |
|---|---:|---|---|
| Criar roteiro com 1 parada (Marco das Três Fronteiras) | 5,4 s | Gemini (e cache) | 11 pontos, com a parada marcada como "Sua parada" (ponto 8); 24,3 km e 49 min no total |

As capturas da tela inicial, do painel, da exploração, do detalhe de destino e de "Meus roteiros" não mudaram com a revisão e continuam as de 20/11 (a de "Meus roteiros" é recortada; a nova captura da tela inteira ficou com muito espaço em branco).

---

## Observações que as medições revelaram

Estes são pontos para o texto do TCC ou para trabalhos futuros.

1. **A latência do Gemini variava mais do que o limite de 8 s comportava.** Nas medições preliminares, os lotes de 10 lugares levaram até 10,7 s, e a cadeia normal caiu no Mistral em 5 de 6 chamadas. O limite passou a 15 s (sobram 20 s dos 35 s da cadeia para a reserva), e na nova medição a reserva não foi acionada. Vale acompanhar a latência no ambiente publicado.
2. **O Mistral local às vezes devolve o JSON sem a chave `pontos`.** Ele manda o objeto do lugar direto, o leitor da resposta recusa esse formato e aquele lote fica sem curadoria. Combinado com o item 1, deixou um roteiro inteiro sem curadoria na execução 1. Aceitar esse formato no `LlmResponseParser` aumentaria a taxa de curadoria do modelo local.
3. **Sem o contexto do trajeto, o Mistral concorda bem menos com a referência** (47,8% contra 75,6%), enquanto o Gemini se manteve (92,6% contra 88,9%). Definir as trilhas e os tipos no prompt é o caminho mais direto para recuperar a qualidade do modelo local sem prender o prompt a uma cidade.
4. **A resposta não diz quando a curadoria veio do cache.** No roteiro repetido, `fonteIA` continua `gemini-3.5-flash-lite`, que é o modelo que curou originalmente. Só o banco mostra que a IA não foi chamada.
5. **Muitas sugestões ficam dentro do próprio aeroporto.** Saindo do aeroporto, 75% das sugestões são de alimentação, algumas na área de embarque.
6. **Reabrir um roteiro salvo perde as paradas**, e as sugestões podem mudar, porque o roteiro é gerado de novo.

## O que não foi medido

- Tamanho das imagens Docker e tempo de build delas: exige buildar as três imagens de produção.
- Carga e concorrência (várias pessoas ao mesmo tempo), inclusive o limite de uso na prática.
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
(cd frontend && npx eslint . && npx vitest run && npm run build)
node docs/medidas/scripts/frontend-bundle.mjs

# Cobertura (sem alterar pom.xml nem package.json)
./mvnw clean org.jacoco:jacoco-maven-plugin:0.8.14:prepare-agent verify org.jacoco:jacoco-maven-plugin:0.8.14:report
npm i --no-save @vitest/coverage-v8@3.2.4 && npx vitest run --coverage

# Lighthouse (frontend em produção com `npx next start -p 3100`)
node docs/medidas/scripts/lighthouse.mjs http://localhost:3100 "<caminho do Chrome ou Edge>"

# Curadoria (chama o LLM; não chama o Google)
node docs/medidas/scripts/curadoria-ia.mjs http://localhost:8000 gemini 3

# Ponta a ponta (gasta cota do Google: registre no controle de cota)
node docs/medidas/scripts/roteiros-e2e.mjs http://localhost:8080 e2e-execucao3

# Capturas de tela: puppeteer-core instalado numa pasta fora do projeto, com uma cópia do script
#   msedge --headless=new --remote-debugging-port=9334 --user-data-dir=<pasta-temporária> about:blank
node telas.mjs http://localhost:3100 <pasta-de-saída> 9334
```

Para o cenário de cache vazio, suba o backend-core com um banco novo. Para os cenários da seção 4, suba o ia-service com as variáveis de cada linha da tabela: `GEMINI_API_KEY` vazia ou inválida, `OLLAMA_ENABLED=true` ou ausente e, para repetir as medições preliminares, `LLM_TIMEOUT_SECONDS=8` ou `30`. Com o limite de uso padrão, um mesmo IP gera até 10 roteiros por hora; para repetir as séries seguidas, aumente `ROTEIRO_LIMITE_POR_IP_POR_HORA`.

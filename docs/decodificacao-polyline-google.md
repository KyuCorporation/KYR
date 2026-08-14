# Decodificação do Encoded Polyline (Google Directions API)

Relacionado: US-10 (integração com Google Maps) · US-10.1

---

## 1. O problema

A Directions API do Google não devolve a rota como uma lista de pontos [{lat, lng}, {lat, lng}, ...]. Isso seria simples de ler, mas pesado demais em JSON pra uma rota com centenas de pontos. Em vez disso, ela devolve a rota inteira comprimida numa única string, no campo overview_polyline.points:

```
"_p~iF~ps|U_ulLnnqC_mqNvxq`@"
```

Esse formato é o **Encoded Polyline Algorithm Format**, documentado oficialmente pelo Google em: https://developers.google.com/maps/documentation/utilities/polylinealgorithm?hl=pt-br

Pra desenhar a rota no frontend, alguém precisa desfazer essa compressão, leia-se transformar a string de volta numa lista de coordenadas. É isso que este documento explica, e o que a US-10.1 pede pra implementar.

---

## 2. A ideia geral

A string não guarda "latitude, longitude, latitude, longitude...". Ela guarda **diferenças** entre um ponto e o seguinte (delta), porque pontos vizinhos de uma rota costumam estar bem próximos entre si. Codificar a diferença gasta bem menos espaço do que codificar o valor absoluto toda vez.

O algoritmo de decodificação faz, em loop, pra cada ponto da rota:

1. Lê um pedaço da string → isso vira "quanto a latitude mudou desde o ponto anterior";
2. Lê o próximo pedaço → "quanto a longitude mudou";
3. Soma essas mudanças na latitude/longitude acumuladas;
4. Salva o ponto resultante;
5. Repete até a string acabar;

---

## 3. Decodificando um pedaço na mão

Os 5 primeiros caracteres da string de exemplo `_p~iF` decodificam sozinhos pra primeira latitude: `38.5`. Este é o exemplo oficial da documentação do Google, então serve como caso de teste confiável.

### Passo 1 — cada caractere vira um número, subtraindo 63

| char | código ASCII | código − 63 |
|---|---|---|
| `_` | 95 | 32 |
| `p` | 112 | 49 |
| `~` | 126 | 63 |
| `i` | 105 | 42 |
| `F` | 70 | 7 |

### Passo 2 — o bit

Cada número (0–63) cabe em 6 bits, mas o alfabeto usado varia de 63 a 126, então sobra 1 bit livre (valor 32, 0x20). Esse bit funciona como flag de continuação, ou seja, este caractere sozinho não fecha o valor.

Na tabela do primeiro passo, 32, 49, 63 e 42 são ≥ 32 → ou seja, tem mais. Só o 7 é < 32 → ou seja, acabou este é o último pedaço. Por isso os 5 caracteres inteiros pertencem a um único número (a primeira latitude).

### Passo 3 — tirar a flag, ficar só com os 5 bits úteis

`b & 0x1f` (`0x1f` = `00011111` em binário) apaga o bit de flag:

```
32 & 31 = 0
49 & 31 = 17
63 & 31 = 31
42 & 31 = 10
7  & 31 = 7
```

### Passo 4 — juntar os pedaços de 5 bits num número só

Cada pedaço é uma peça de 5 bits. O primeiro caractere lido carrega os bits **menos** significativos; o shift aumenta de 5 em 5 a cada novo caractere:

resultado = 0<<0 | 17<<5 | 31<<10 | 10<<15 | 7<<20
          =   0  +  544  + 31744  + 327680 + 7340032
          = 7700000


### Passo 5 — zigzag: destorcer o sinal

Coordenadas podem ser negativas, como a longitude de Foz do Iguaçu, por exemplo, é negativa, mas os passos acima só produzem números positivos. O truque do Google pra representar sinal é intercalar positivo/negativo, veja melhor abaixo::

`0, -1, 1, -2, 2, -3, 3...` -> se o valor final for **ímpar**, é negativo:

em java:

```java
(result & 1) != 0 ? ~(result >> 1) : (result >> 1)
```

- `result & 1` checa se é ímpar
- par → a resposta é `result / 2` (>> 1)
- ímpar → a resposta é `~(result / 2)` (o ~ inverte os bits, é assim que Java representa o negativo correspondente)

No exemplo, 7700000 é par: 7700000 >> 1 = 3850000.

### Passo 6 — a casa decimal

O Google multiplica a coordenada original por 100.000 antes de codificar (para trabalhar só com inteiros). Para desfazer, divide por `1e5`:

```
3850000 / 1e5 = 38.5
```

Bate exatamente com o valor oficial do exemplo do Google (38.5, -120.2 é o primeiro ponto completo). O mesmo processo se repete pra longitude e depois pro próximo ponto, até a string acabar.

---

## 4. Fluxo completo

O ciclo abaixo se repete duas vezes por ponto (uma para latitude, uma para longitude) e recomeça do zero para o próximo ponto, até a string acabar:

```
┌─────────────────────┐
│   Lê um caractere    │  até o bit de continuação (>= 0x20) desligar
└──────────┬───────────┘
           ▼
┌─────────────────────┐
│  Extrai os 5 bits    │  (b & 0x1f) << shift, shift += 5
└──────────┬───────────┘
           ▼
┌─────────────────────┐
│   Desfaz o zigzag    │  ímpar vira negativo
└──────────┬───────────┘
           ▼
┌─────────────────────┐
│  Soma no acumulado   │  essa é a mudança desde o ponto anterior
└──────────┬───────────┘
           ▼
┌─────────────────────┐
│    Salva o ponto     │  divide tudo por 100000
└──────────┬───────────┘
           │
           └──── repete até acabar a string ────┐
                                                 │
           ◄─────────────────────────────────────┘
```

---

## 5. Por que confiar nisso?

Este é o algoritmo oficial documentado pelo Google, e o exemplo usado aqui (_p~iF~ps|U_ulLnnqC_mqNvxq@ → 38.5, -120.2 / 40.7, -120.95 / 43.252, -126.453) é o caso de teste canônico da própria documentação. Qualquer implementação deve bater exatamente com esses três pontos, sendo o critério de aceite mais confiável que existe pra validar o decoder.

---

## 6. Onde isso se encaixa no projeto?

- US-10: US de buscar a rota real (Directions API) e os POIs ao longo dela.
- US-10.1: Esta documentação é a base dela. Pega o campo overview_polyline.points que a Directions API já devolve, decodifica com o algoritmo acima, e expõe a linha da rota pronta no contrato de resposta, para o frontend desenhar o caminho seguindo as ruas.

## 7. Referências
- GOOGLE FOR DEVELOPERS. Encoded Polyline Algorithm Format. Google Maps Platform. Disponível em: https://developers.google.com/maps/documentation/utilities/polylinealgorithm?hl=pt-br.
- GOOGLE FOR DEVELOPERS. Directions API overview. Google Maps Platform. Disponível em: https://developers.google.com/maps/documentation/directions/overview?hl=pt-br.
- GOOGLE FOR DEVELOPERS. Directions Service. Maps JavaScript API. Disponível em: https://developers.google.com/maps/documentation/javascript/legacy/directions?hl=pt-br.
- GOOGLE FOR DEVELOPERS. Interactive Polyline Encoder Utility. Google Maps Platform. Disponível em: https://developers.google.com/maps/documentation/utilities/polylineutility?hl=pt-br.
- MAPBOX. polyline (biblioteca JavaScript/Node.js). GitHub. Disponível em: https://github.com/mapbox/polyline.
- JANSEN, F.; CUSTÓDIO, B. M. polyline (biblioteca Python, porta da implementação da Mapbox). PyPI. Disponível em: https://pypi.org/project/polyline/.
- GOOGLE FOR DEVELOPERS. Request route polylines. Routes API. Disponível em: https://developers.google.com/maps/documentation/routes/traffic_on_polylines?hl=pt-br.
/*

NOTA TÉCNICA EXPLICATIVA

O Google, pra não mandar uma rota como [{lat: -25.60, lng: -54.48}, {lat: -25.61, lng: -54.49}, ...] pois seria um JSON muito grande, então eles comprimem tudo numa string curta tipo "_p~iF~ps|U_ulLnnqC_mqNvxq@". Isso é chamado de Encoded Polyline Format, que é um algoritmo de compressão do próprio Google, e é preciso de um código para descomprimir, que no caso é esse arquivo.

Podemos pensar que esse algoritmo guarda diferenças entre um ponto e o próximo (delta), pois pontos vizinhos de uma rota são bem parecidos entre si e é bem mais econômico codificar a diferença, pois gasta menos espaço, do que codificar o valor inteiro de uma vez só.

Com isso, o algoritmo faz, em loop, para cada ponto:
1 - Lê um pedaço da string → isso vira "quanto a latitude mudou desde o ponto anterior"
2 - Lê o próximo pedaço → "quanto a longitude mudou"
3 - Soma essas mudanças na lat/lng acumuladas
4 - Salva o ponto
5 - Repete até acabar a string

Tem uma tabela para decodificar na mão, com 6 passos importantes para entender esse código, deixarei uma documentação técnica explicativa na pasta docs/ para caso quem esteja lendo esse arquivo precise.

*/


package br.tourapp.kyr.poi.client;

import br.tourapp.kyr.poi.model.Coordenada;

import java.util.ArrayList;
import java.util.List;

public final class PolylineDecoder {

    private PolylineDecoder() {
    }

    public static List<Coordenada> decode(String encoded) {
        List<Coordenada> pontos = new ArrayList<>();
        int index = 0;
        int lat = 0;
        int lng = 0;

        while (index < encoded.length()) {
            // bloco 1: decodifica o DELTA de latitude
            int shift = 0;
            int result = 0;
            int b;
            do {
                b = encoded.charAt(index++) - 63; // tira o "deslocamento" do alfabeto
                result |= (b & 0x1f) << shift; // pega os 5 bits úteis e encaixa na posição certa
                shift += 5;
            } while (b >= 0x20); // "ainda tem continuação"? lê mais um caractere
            lat += (result & 1) != 0 ? ~(result >> 1) : (result >> 1); // desfaz o zigzag e SOMA no total acumulado

            // bloco 2: exatamente a mesma coisa, mas pra longitude
            shift = 0;
            result = 0;
            do {
                b = encoded.charAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20);
            lng += (result & 1) != 0 ? ~(result >> 1) : (result >> 1);

            pontos.add(new Coordenada(lat / 1e5, lng / 1e5)); // divide por 100000 e salva o ponto
        }

        return pontos;
    }
}

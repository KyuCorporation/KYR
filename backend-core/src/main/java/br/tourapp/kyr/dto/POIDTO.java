package br.tourapp.kyr.dto;

public record POIDTO(
        String nome,
        String trilha,
        String tipo,
        String endereco,
        Double latitude,
        Double longitude,
        String fonte,
        String descricao,
        boolean curado,
        Long distanciaMetros,
        Long duracaoSegundos,
        // ID do lugar no Google. É o único dado do lugar que o cliente pode guardar sem prazo.
        String placeId,
        // true quando o ponto é uma parada escolhida pela pessoa, e não um lugar sugerido.
        boolean parada
) {

    public POIDTO(String nome, String trilha, String tipo, String endereco, Double latitude, Double longitude,
                  String fonte, String descricao, boolean curado, Long distanciaMetros, Long duracaoSegundos,
                  String placeId) {
        this(nome, trilha, tipo, endereco, latitude, longitude, fonte, descricao, curado, distanciaMetros,
                duracaoSegundos, placeId, false);
    }

    public POIDTO(String nome, String trilha, String tipo, String endereco, Double latitude, Double longitude,
                  String fonte, String descricao, boolean curado, Long distanciaMetros, Long duracaoSegundos) {
        this(nome, trilha, tipo, endereco, latitude, longitude, fonte, descricao, curado, distanciaMetros,
                duracaoSegundos, null, false);
    }

    public static POIDTO daParada(PontoDTO parada) {
        return new POIDTO(parada.nome(), null, null, null, parada.latitude(), parada.longitude(), null, null,
                false, null, null, null, true);
    }

    public POIDTO comTrecho(Long distanciaMetros, Long duracaoSegundos) {
        return new POIDTO(nome, trilha, tipo, endereco, latitude, longitude, fonte, descricao, curado,
                distanciaMetros, duracaoSegundos, placeId, parada);
    }
}

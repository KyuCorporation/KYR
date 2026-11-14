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
        String placeId
) {

    public POIDTO(String nome, String trilha, String tipo, String endereco, Double latitude, Double longitude,
                  String fonte, String descricao, boolean curado, Long distanciaMetros, Long duracaoSegundos) {
        this(nome, trilha, tipo, endereco, latitude, longitude, fonte, descricao, curado, distanciaMetros,
                duracaoSegundos, null);
    }

    public POIDTO comTrecho(Long distanciaMetros, Long duracaoSegundos) {
        return new POIDTO(nome, trilha, tipo, endereco, latitude, longitude, fonte, descricao, curado,
                distanciaMetros, duracaoSegundos, placeId);
    }
}

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
        Long duracaoSegundos
) {

    public POIDTO comTrecho(Long distanciaMetros, Long duracaoSegundos) {
        return new POIDTO(nome, trilha, tipo, endereco, latitude, longitude, fonte, descricao, curado,
                distanciaMetros, duracaoSegundos);
    }
}

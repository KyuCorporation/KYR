package br.kyutech.kyr.dto;

public record POIDTO(
    String nome,
    String trilha,
    String tipo,
    String endereco,
    Double latitude,
    Double longitude,
    String fonte,
    String descricao,
    Integer distanciaMetros,
    Integer duracaoSegundos
) {
    
    public POIDTO(String nome, String trilha, String tipo, String endereco,
                  Double latitude, Double longitude, String fonte, String descricao) {
        this(nome, trilha, tipo, endereco, latitude, longitude, fonte, descricao, null, null);
    }
}

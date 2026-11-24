package br.tourapp.kyr.dto;

public record MetadadosDTO(
    int totalPontos,
    long tempoRespostaMs,
    String fonteIA,
    boolean curadoPorIa,
    String fonteRota,
    // Meio de transporte usado nas distâncias e tempos (DRIVING, WALKING, BICYCLING ou TRANSIT).
    String transporte,
    // Soma de todos os trechos da rota ordenada, da origem ao destino, incluindo o trecho do último ponto
    // até o destino (que não pertence a nenhum ponto). Nulos quando a rota não foi ordenada pela Directions.
    Long distanciaTotalMetros,
    Long duracaoTotalSegundos
) {

    public MetadadosDTO(int totalPontos, long tempoRespostaMs, String fonteIA, boolean curadoPorIa, String fonteRota,
                        String transporte) {
        this(totalPontos, tempoRespostaMs, fonteIA, curadoPorIa, fonteRota, transporte, null, null);
    }

    public MetadadosDTO(int totalPontos, long tempoRespostaMs, String fonteIA, boolean curadoPorIa, String fonteRota) {
        this(totalPontos, tempoRespostaMs, fonteIA, curadoPorIa, fonteRota, Transporte.DRIVING.name());
    }
}

package br.tourapp.kyr.service;

import java.util.Collection;
import java.util.Map;

// Guarda a curadoria que a IA já fez para um lugar (trilha, tipo e descrição), indexada pelo ID do lugar
// no Google. Assim, um lugar que já apareceu em outro roteiro não é enviado de novo ao ia-service.
// O que fica guardado é conteúdo do KYR mais o ID do lugar, que os termos da Places API deixam guardar
// sem prazo; nome, endereço e nota do lugar não entram aqui.
public interface CuradoriaCache {

    Map<String, Curada> buscar(Collection<String> placeIds);

    void salvar(Map<String, Curada> curadas);

    record Curada(String trilha, String tipo, String descricao, String modelo) {
    }

    // Usado nos testes e quando não há banco: nada é lido nem gravado.
    CuradoriaCache SEM_CACHE = new CuradoriaCache() {
        @Override
        public Map<String, Curada> buscar(Collection<String> placeIds) {
            return Map.of();
        }

        @Override
        public void salvar(Map<String, Curada> curadas) {
        }
    };
}

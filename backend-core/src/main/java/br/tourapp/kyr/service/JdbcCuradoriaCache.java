package br.tourapp.kyr.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Component
public class JdbcCuradoriaCache implements CuradoriaCache {

    private final JdbcClient jdbc;
    private final int validadeDias;

    // A curadoria guardada vale por um prazo (padrão: 30 dias). Depois disso o lugar volta para a IA,
    // o que renova descrições antigas ou feitas por um modelo mais fraco da cadeia.
    public JdbcCuradoriaCache(JdbcClient jdbc, @Value("${roteiro.cache-curadoria-dias:30}") int validadeDias) {
        this.jdbc = jdbc;
        this.validadeDias = validadeDias;
    }

    @Override
    public Map<String, Curada> buscar(Collection<String> placeIds) {
        List<String> ids = placeIds.stream().filter(Objects::nonNull).distinct().toList();
        if (ids.isEmpty()) {
            return Map.of();
        }
        Map<String, Curada> encontradas = new HashMap<>();
        jdbc.sql("""
                        select place_id, trilha, tipo, descricao, modelo
                          from curadoria_poi
                         where place_id in (:ids) and curado_em > now() - make_interval(days => :dias)
                        """)
                .param("ids", ids)
                .param("dias", validadeDias)
                .query((rs, n) -> encontradas.put(rs.getString("place_id"),
                        new Curada(rs.getString("trilha"), rs.getString("tipo"), rs.getString("descricao"), rs.getString("modelo"))))
                .list();
        return encontradas;
    }

    @Override
    public void salvar(Map<String, Curada> curadas) {
        curadas.forEach((placeId, curada) -> jdbc.sql("""
                        insert into curadoria_poi (place_id, trilha, tipo, descricao, modelo)
                        values (:placeId, :trilha, :tipo, :descricao, :modelo)
                        on conflict (place_id)
                        do update set trilha = excluded.trilha, tipo = excluded.tipo, descricao = excluded.descricao,
                                      modelo = excluded.modelo, curado_em = now()
                        """)
                .param("placeId", placeId)
                .param("trilha", curada.trilha())
                .param("tipo", curada.tipo())
                .param("descricao", curada.descricao())
                .param("modelo", curada.modelo())
                .update());
    }
}

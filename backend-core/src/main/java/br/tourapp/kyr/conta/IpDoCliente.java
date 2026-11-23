package br.tourapp.kyr.conta;

import jakarta.servlet.http.HttpServletRequest;

// IP de quem fez a requisição, para os limites de tentativas.
// O navegador não fala direto com o backend: o servidor do Next repassa o X-Forwarded-For. Usa o último
// endereço da lista, que é o anotado pelo proxy mais próximo. Os da esquerda podem ter sido enviados pelo
// próprio cliente e são ignorados. Sem o cabeçalho, vale o endereço da conexão.
final class IpDoCliente {

    private IpDoCliente() {
    }

    static String de(HttpServletRequest requisicao) {
        String encaminhado = requisicao.getHeader("X-Forwarded-For");
        if (encaminhado != null) {
            String[] enderecos = encaminhado.split(",");
            for (int i = enderecos.length - 1; i >= 0; i--) {
                String endereco = enderecos[i].trim();
                if (!endereco.isEmpty()) {
                    return endereco;
                }
            }
        }
        return requisicao.getRemoteAddr();
    }
}

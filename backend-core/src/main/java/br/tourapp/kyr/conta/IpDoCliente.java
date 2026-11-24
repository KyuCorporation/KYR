package br.tourapp.kyr.conta;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.List;

// IP de quem fez a requisição, usado só nos limites de uso (login, cadastro e geração de roteiros).
//
// O X-Forwarded-For pode ser escrito pelo próprio cliente, então só vale o que um proxy confiável anotou:
// - Pelo frontend: o servidor do Next manda o IP do navegador em X-Kyr-Client-Ip, junto com um segredo
//   compartilhado (X-Kyr-Proxy-Token). Sem o segredo certo, esse cabeçalho é ignorado.
// - Atrás de N proxies confiáveis (o balanceador da hospedagem, por exemplo), cada um acrescenta um
//   endereço no fim do X-Forwarded-For; o do cliente é o N-ésimo contado do fim.
// - Sem proxy configurado (o padrão), vale o endereço da conexão, e o X-Forwarded-For é ignorado.
@Component
public class IpDoCliente {

    static final String CABECALHO_IP = "X-Kyr-Client-Ip";
    static final String CABECALHO_TOKEN = "X-Kyr-Proxy-Token";

    private final int proxiesConfiaveis;
    private final byte[] tokenDoFrontend;

    public IpDoCliente(@Value("${kyr.seguranca.proxies-confiaveis:0}") int proxiesConfiaveis,
                       @Value("${kyr.seguranca.token-do-frontend:}") String tokenDoFrontend) {
        this.proxiesConfiaveis = Math.max(proxiesConfiaveis, 0);
        this.tokenDoFrontend = tokenDoFrontend == null ? new byte[0] : tokenDoFrontend.strip().getBytes(StandardCharsets.UTF_8);
    }

    public String de(HttpServletRequest requisicao) {
        String doFrontend = ipInformadoPeloFrontend(requisicao);
        if (doFrontend != null) {
            return doFrontend;
        }

        String conexao = requisicao.getRemoteAddr();
        String encaminhado = requisicao.getHeader("X-Forwarded-For");
        if (proxiesConfiaveis == 0 || encaminhado == null) {
            return conexao;
        }
        List<String> enderecos = Arrays.stream(encaminhado.split(","))
                .map(String::trim)
                .filter(endereco -> !endereco.isEmpty())
                .toList();
        if (enderecos.isEmpty()) {
            return conexao;
        }
        return enderecos.get(Math.max(enderecos.size() - proxiesConfiaveis, 0));
    }

    private String ipInformadoPeloFrontend(HttpServletRequest requisicao) {
        if (tokenDoFrontend.length == 0) {
            return null;
        }
        String token = requisicao.getHeader(CABECALHO_TOKEN);
        String ip = requisicao.getHeader(CABECALHO_IP);
        if (token == null || ip == null || ip.isBlank()) {
            return null;
        }
        boolean confere = MessageDigest.isEqual(token.strip().getBytes(StandardCharsets.UTF_8), tokenDoFrontend);
        return confere ? ip.strip() : null;
    }
}

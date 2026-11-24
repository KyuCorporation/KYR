package br.tourapp.kyr.iaservice.config;

import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;

class IaServiceClientConfigTest {

    private HttpServer servidor;
    private final AtomicReference<String> tokenRecebido = new AtomicReference<>();

    @BeforeEach
    void subirServidor() throws IOException {
        servidor = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        servidor.createContext("/curar-roteiro", troca -> {
            tokenRecebido.set(troca.getRequestHeaders().getFirst("X-Kyr-Token"));
            byte[] corpo = "{}".getBytes(StandardCharsets.UTF_8);
            troca.sendResponseHeaders(200, corpo.length);
            troca.getResponseBody().write(corpo);
            troca.close();
        });
        servidor.start();
    }

    @AfterEach
    void derrubarServidor() {
        servidor.stop(0);
    }

    private String chamarCom(String token) {
        String base = "http://127.0.0.1:" + servidor.getAddress().getPort();
        RestClient cliente = new IaServiceClientConfig().iaServiceRestClient(new IaServiceProperties(base, 5, token));
        cliente.post().uri("/curar-roteiro").body("{}").retrieve().toBodilessEntity();
        return tokenRecebido.get();
    }

    @Test
    void enviaOTokenCompartilhadoQuandoConfigurado() {
        assertThat(chamarCom(" segredo-do-ia ")).isEqualTo("segredo-do-ia");
    }

    @Test
    void semTokenNaoEnviaOCabecalho() {
        assertThat(chamarCom("")).isNull();
    }

    @Test
    void oTokenNaoApareceNoToString() {
        assertThat(new IaServiceProperties("http://ia", 5, "segredo").toString()).doesNotContain("segredo");
    }
}

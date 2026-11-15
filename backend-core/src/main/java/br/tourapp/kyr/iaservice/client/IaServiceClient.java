package br.tourapp.kyr.iaservice.client;

import br.tourapp.kyr.iaservice.client.dto.CuradoriaRequestDto;
import br.tourapp.kyr.iaservice.client.dto.CuradoriaResponseDto;
import br.tourapp.kyr.iaservice.client.dto.PontoBrutoDto;
import br.tourapp.kyr.iaservice.exception.IaServiceException;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.List;

@Component
public class IaServiceClient {

    private static final String CURAR_ROTEIRO_PATH = "/curar-roteiro";

    private final RestClient restClient;

    public IaServiceClient(@Qualifier("iaServiceRestClient") RestClient restClient) {
        this.restClient = restClient;
    }

    public CuradoriaResponseDto curar(List<PontoBrutoDto> pontos) {
        CuradoriaResponseDto resposta;
        try {
            resposta = restClient.post()
                    .uri(CURAR_ROTEIRO_PATH)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(new CuradoriaRequestDto(pontos))
                    .retrieve()
                    .body(CuradoriaResponseDto.class);
        } catch (RestClientException ex) {
            throw new IaServiceException("Falha de comunicação com o ia-service (" + ex.getClass().getSimpleName() + ")");
        }

        if (resposta == null || resposta.pontos() == null) {
            throw new IaServiceException("Resposta vazia do ia-service");
        }
        return resposta;
    }
}

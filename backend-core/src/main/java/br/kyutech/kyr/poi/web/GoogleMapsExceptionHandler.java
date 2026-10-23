package br.kyutech.kyr.poi.web;

import br.kyutech.kyr.poi.exception.GoogleMapsIntegrationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(basePackages = "br.kyutech.kyr.poi")

public class GoogleMapsExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GoogleMapsExceptionHandler.class);

    @ExceptionHandler(GoogleMapsIntegrationException.class)

    public ResponseEntity<ErroRespostaDto> tratarErroIntegracao(GoogleMapsIntegrationException ex) {
        log.error("Falha na integração com o Google Maps: {}", ex.getMessage());

        return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                .body(new ErroRespostaDto("erro_integracao_google_maps", ex.getMessage()));
    }
}

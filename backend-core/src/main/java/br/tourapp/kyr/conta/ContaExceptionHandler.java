package br.tourapp.kyr.conta;

import br.tourapp.kyr.poi.web.ErroRespostaDto;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

// Erros de regra e de validação no formato { codigo, mensagem }. Vale para as rotas de conta e também para
// as de roteiro (POST /roteiros e GET /api/v1/rotas/pois), que usam o mesmo limite de uso (429).
@RestControllerAdvice(basePackages = {"br.tourapp.kyr.conta", "br.tourapp.kyr.controller", "br.tourapp.kyr.poi.web"})
public class ContaExceptionHandler {

    @ExceptionHandler(ContaException.class)
    public ResponseEntity<ErroRespostaDto> tratar(ContaException ex) {
        ResponseEntity.BodyBuilder resposta = ResponseEntity.status(ex.status());
        if (ex instanceof MuitasTentativasException muitas) {
            resposta.header(HttpHeaders.RETRY_AFTER, String.valueOf(muitas.segundosDeEspera()));
        }
        return resposta.body(new ErroRespostaDto(ex.codigo(), ex.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErroRespostaDto> tratarValidacao(MethodArgumentNotValidException ex) {
        String mensagem = ex.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(erro -> erro.getDefaultMessage())
                .orElse("Dados inválidos.");
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new ErroRespostaDto("dados_invalidos", mensagem));
    }

    // JSON malformado ou valor fora do esperado (um meio de transporte desconhecido, por exemplo).
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErroRespostaDto> tratarCorpoIlegivel(HttpMessageNotReadableException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErroRespostaDto("dados_invalidos", "O corpo da requisição tem um formato inválido."));
    }
}

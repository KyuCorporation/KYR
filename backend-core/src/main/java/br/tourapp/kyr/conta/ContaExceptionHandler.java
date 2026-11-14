package br.tourapp.kyr.conta;

import br.tourapp.kyr.poi.web.ErroRespostaDto;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(basePackages = "br.tourapp.kyr.conta")
public class ContaExceptionHandler {

    @ExceptionHandler(ContaException.class)
    public ResponseEntity<ErroRespostaDto> tratar(ContaException ex) {
        return ResponseEntity.status(ex.status()).body(new ErroRespostaDto(ex.codigo(), ex.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErroRespostaDto> tratarValidacao(MethodArgumentNotValidException ex) {
        String mensagem = ex.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(erro -> erro.getDefaultMessage())
                .orElse("Dados inválidos.");
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new ErroRespostaDto("dados_invalidos", mensagem));
    }
}

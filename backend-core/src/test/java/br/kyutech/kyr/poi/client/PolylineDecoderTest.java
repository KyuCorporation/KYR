package br.tourapp.kyr.poi.client;

import br.tourapp.kyr.poi.model.Coordenada;
import org.assertj.core.data.Offset;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class PolylineDecoderTest {

    @Test
    void deveDecodificarPolylineDeExemploDaDocumentacaoDoGoogle() {
        List<Coordenada> pontos = PolylineDecoder.decode("_p~iF~ps|U_ulLnnqC_mqNvxq`@");

        assertThat(pontos).hasSize(3);
        assertThat(pontos.get(0).latitude()).isEqualTo(38.5, Offset.offset(1e-4));
        assertThat(pontos.get(0).longitude()).isEqualTo(-120.2, Offset.offset(1e-4));
        assertThat(pontos.get(1).latitude()).isEqualTo(40.7, Offset.offset(1e-4));
        assertThat(pontos.get(1).longitude()).isEqualTo(-120.95, Offset.offset(1e-4));
        assertThat(pontos.get(2).latitude()).isEqualTo(43.252, Offset.offset(1e-4));
        assertThat(pontos.get(2).longitude()).isEqualTo(-126.453, Offset.offset(1e-4));
    }

    @Test
    void deveRetornarListaVaziaParaStringVazia() {
        assertThat(PolylineDecoder.decode("")).isEmpty();
    }
}

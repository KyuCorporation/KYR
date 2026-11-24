package br.tourapp.kyr.poi.config;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class GoogleMapsPropertiesTest {

    @Test
    void toStringNaoExpoeAChaveDaApi() {
        GoogleMapsProperties properties = new GoogleMapsProperties(
                "CHAVE-SECRETA-NAO-PODE-VAZAR", null, null, null, null);

        assertThat(properties.toString()).doesNotContain("CHAVE-SECRETA-NAO-PODE-VAZAR");
    }
}

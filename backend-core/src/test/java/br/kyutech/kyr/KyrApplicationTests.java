package br.tourapp.kyr;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

@Import(TestcontainersConfiguration.class)
@SpringBootTest
class KyrApplicationTests {

    @Test
    void contextLoads() {
    }

}

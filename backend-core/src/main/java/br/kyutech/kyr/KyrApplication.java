package br.kyutech.kyr;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
public class KyrApplication {

    public static void main(String[] args) {
        SpringApplication.run(KyrApplication.class, args);
    }

}

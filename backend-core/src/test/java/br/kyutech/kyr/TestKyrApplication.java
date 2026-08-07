package br.kyutech.kyr;

import org.springframework.boot.SpringApplication;

public class TestKyrApplication {

    public static void main(String[] args) {
        SpringApplication.from(KyrApplication::main).with(TestcontainersConfiguration.class).run(args);
    }

}

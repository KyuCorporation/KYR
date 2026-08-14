FROM maven:3.9.16-eclipse-temurin-21-alpine AS build

WORKDIR /app

COPY pom.xml .
COPY mvnw .
COPY .mvn .mvn

RUN mvn dependency:go-offline

COPY src ./src

CMD ["mvn", "spring-boot:run"]

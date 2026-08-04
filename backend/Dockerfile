FROM maven:3.9.16-eclipse-temurin-25-noble AS build

WORKDIR /workspace
COPY .mvn .mvn
COPY mvnw pom.xml ./
RUN ./mvnw --batch-mode --no-transfer-progress dependency:go-offline
COPY src src
RUN ./mvnw --batch-mode --no-transfer-progress -DskipTests package

FROM eclipse-temurin:25.0.3_9-jre-noble

WORKDIR /app
COPY --from=build /workspace/target/backend-*.jar app.jar
USER 10001:10001
EXPOSE 8080 8082
ENTRYPOINT ["java", "-jar", "/app/app.jar"]

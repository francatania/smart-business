# Backend

This directory contains the Java 25 and Spring Boot modular monolith. See
`docs/technical-architecture.md` for the accepted architecture.

## Run on the host

Start the infrastructure first, then run the application:

```bash
make infra-up
make backend-run
```

The public application listens on `http://localhost:8080`. Health and metrics are
isolated on the management listener at `http://localhost:8082`.

## Run as a container

```bash
docker compose --env-file infra/.env.example -f infra/compose.yaml \
  --profile backend up -d --build backend
```

The local credentials in `infra/.env.example` are development-only defaults.

## Module boundaries

The modular monolith uses closed Spring Modulith modules. Cross-module calls may
only target packages explicitly annotated as the module's `api` named interface.
Run `./mvnw test` to verify the production graph and the negative enforcement
fixtures.

## Database migrations

Flyway is the only schema owner. Migrations live in
`src/main/resources/db/migration`, Hibernate runs with `ddl-auto=validate`, and
Spring Session's built-in schema initializer is disabled. Integration tests use
PostgreSQL 18.4 through Testcontainers; H2 is intentionally not supported.

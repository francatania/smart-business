# Smart Business

Smart Business is a business-agnostic platform for appointment-based personal care businesses. It combines scheduling, organization-owned customer service records, secure media, and future AI-assisted consultation. The initial product targets barbershops while keeping domain language suitable for other verticals.

The current foundation provides an executable Spring Boot modular monolith, PostgreSQL persistence, local object storage compatible with S3, email capture, an installable customer/professional portal, a business administration application, generated OpenAPI types, observability, tests, and CI gates. Keycloak supplies Portal and Administration OIDC login, Google brokering, passkeys, coordinated logout, and server-side session identity. Booking, organization authorization, customer records, media workflows, account recovery, and AI behavior are delivered by later issues and epics.

## Repository layout

```text
backend/                    Spring Boot modular monolith
frontend/apps/portal/       Customer and professional PWA
frontend/apps/admin/        Business administration application
frontend/packages/          Shared TypeScript packages
frontend/e2e/               Cross-application Playwright tests
infra/                      Local Docker Compose infrastructure
openapi/                    Generated API contract
security/                   Expiring dependency exception policy
docs/                       Product, architecture, and development documentation
```

## Prerequisites

Install these exact supported toolchains:

- Java 25
- Maven 3.9.16 through the committed Maven Wrapper
- Node.js 24.18.1 LTS
- pnpm 10.34.0 through Corepack
- Docker Engine or Docker Desktop with Docker Compose v2

Java and Node declarations live in `.java-version` and `.nvmrc`; no particular version manager is required. Confirm the environment before starting:

```bash
java -version
node --version
docker version
docker compose version
make help
```

The repository enforces the Node and pnpm versions. `make setup` enables Corepack, activates pnpm 10.34.0, and installs the frozen workspace dependencies:

```bash
make setup
```

`make setup` creates the ignored `infra/.env` from `infra/.env.example` when it
does not exist. Customize local port mappings and disposable credentials only
in `infra/.env`; never modify the committed example for machine-specific
settings.

## Host-development mode

Start PostgreSQL, Keycloak, Garage, and Mailpit:

```bash
make infra-up
docker compose --env-file infra/.env -f infra/compose.yaml ps
```

Wait until all four services report `healthy`. Then use three terminals:

```bash
make backend-run
make portal-dev
make admin-dev
```

The Vite servers proxy same-origin `/api` requests to the backend. The applications are available at:

| Surface            | URL                                                  |
| ------------------ | ---------------------------------------------------- |
| Portal PWA         | `http://portal.localhost:5173/book`                  |
| Administration     | `http://admin.localhost:5174/calendar`               |
| Backend API        | `http://localhost:8080/api/system/info`              |
| Portal login       | `http://portal.localhost:5173/api/auth/login/portal` |
| Admin login        | `http://admin.localhost:5174/api/auth/login/admin`   |
| Backend liveness   | `http://localhost:8082/actuator/health/liveness`     |
| Backend readiness  | `http://localhost:8082/actuator/health/readiness`    |
| Prometheus metrics | `http://localhost:8082/actuator/prometheus`          |
| Keycloak           | `http://localhost:8081`                              |
| Garage S3          | `http://localhost:3900`                              |
| Mailpit            | `http://localhost:8025`                              |

The management listener is loopback-only in local Compose. A deployed environment must restrict it to authorized operational networks.

## Fully containerized mode

Build and run infrastructure, backend, portal, and administration together:

```bash
make app-up
docker compose --env-file infra/.env -f infra/compose.yaml --profile applications ps
```

`make app-up` waits for dependencies through health checks but returns before the frontend health checks necessarily change from `starting` to `healthy`. Re-run the `ps` command after a few seconds if needed. `make compose-up` remains available as an alias.

Stop containers while preserving local data:

```bash
make infra-down
```

## Database migrations

Flyway is the only schema owner. The backend applies migrations on startup, Hibernate uses `ddl-auto=validate`, and Spring Session never initializes its own tables. Migration files live under `backend/src/main/resources/db/migration`.

The PostgreSQL integration suite creates a disposable database, applies the migration baseline, validates it twice, and proves Hibernate cannot mutate the schema:

```bash
cd backend
./mvnw test -Dgroups=integration
```

H2 is intentionally unsupported because it cannot validate PostgreSQL-specific schemas, types, locking, or migration behavior.

## Tests and verification

Useful focused commands are:

```bash
make test-fast
make test-integration
pnpm --filter @smart-business/portal test
pnpm --filter @smart-business/admin test
make e2e
```

Playwright expects the fully containerized applications to be healthy. Install Chromium once for host execution:

```bash
pnpm --filter @smart-business/e2e exec playwright install chromium
```

Run the complete CI-equivalent suite with Docker available and the exact host toolchains active:

```bash
make verify
```

This verifies Java formatting and tests, module boundaries, PostgreSQL migrations, frontend formatting/lint/types/tests/builds, public configuration, Compose, OpenAPI drift, Chromium smoke journeys, secrets, and high/critical dependencies. It starts and leaves the application stack running so failures can be inspected.

## OpenAPI generation

The backend runtime contract is canonical. With the backend healthy on port `8080`, regenerate the committed contract and framework-neutral TypeScript client:

```bash
make api-generate
pnpm api:check
```

`pnpm api:check` fails when regeneration changes `openapi/smart-business.json` or `frontend/packages/api-client/src/generated`.

## Configuration and local credentials

Committed examples contain disposable local-only values. Never reuse them in a shared environment. Backend profiles, every supported variable, frontend public configuration, precedence, rotation, and secret ownership are documented in [Configuration and Secret Handling](./docs/development/configuration.md).

Local override and real credential files remain ignored by Git. Run these checks before committing configuration work:

```bash
make secrets-check
make configuration-check
make keycloak-config-check
make security-check
```

`make infra-up` also runs an idempotent one-shot Keycloak reconciler. It creates
or updates the `smart-business` realm, its stable platform roles, and the
confidential `portal-bff` and `admin-bff` clients without deleting users. Run
`make keycloak-reconcile` to reapply those settings after changing local
configuration.

Local application-user setup, live drift checks, secret rotation, backup
recovery, monitoring, and identity troubleshooting are documented in
[Identity and Access Operations](./docs/development/identity-operations.md).

## Destructive reset

Ordinary shutdowns preserve the explicitly named PostgreSQL, Garage, and Mailpit volumes. The following command permanently deletes all local application and Keycloak databases, uploaded Garage objects and metadata, and captured Mailpit messages:

```bash
make infra-reset CONFIRM=delete-smart-business-local-data
```

This reset is irreversible unless the data was backed up. It affects only the named Smart Business development volumes listed in [infra/README.md](./infra/README.md).

## Troubleshooting

- **Wrong Java version:** if Maven reports an unsupported release or the project reports Java 17, activate Java 25 and rerun `java -version`.
- **Wrong Node or pnpm version:** activate Node 24.18.1, run `corepack enable`, then `corepack prepare pnpm@10.34.0 --activate`.
- **Port already allocated:** inspect `docker compose ... ps` and `ss -ltnp`; stop the conflicting local process or change only the port mapping in a personal ignored environment file.
- **Docker daemon unavailable:** start Docker and confirm the active context with `docker context show`. On Linux, confirm the current user can access the Docker socket.
- **Containers remain unhealthy:** run `make infra-logs`, then inspect the specific service. PostgreSQL must be healthy before Keycloak or the backend can start.
- **Credentials changed but login still fails:** initialization variables only apply to a new PostgreSQL volume. Either restore the original local values or perform the clearly destructive reset above.
- **Keycloak settings appear stale:** run `make keycloak-config-check`, `make keycloak-reconcile`, and `make keycloak-drift-check`. Client secrets and exact redirect origins come from the active environment file.
- **Frontend API unavailable:** confirm the backend readiness endpoint is `UP`; both Vite and nginx proxy `/api` to port `8080`.
- **Testcontainers cannot reach Docker:** confirm `/var/run/docker.sock` is accessible and no stale `DOCKER_HOST` points to another daemon.
- **Generated API drift:** start the current backend, run `pnpm api:generate`, inspect the contract change, and commit the contract and client together.
- **PWA appears stale:** close installed instances, unregister the local service worker in browser developer tools, and reload once online.

## Documentation

Product decisions, business ownership rules, user flows, architecture, and development runbooks are indexed in [docs/README.md](./docs/README.md). Repository documentation, source code, domain names, and GitHub issues are written in English.

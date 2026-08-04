# Automated Testing

The test pyramid is designed for fast local feedback and production-equivalent persistence checks. Tests must be deterministic, own their data, and leave no persistent shared state.

## Backend

- Unit and architecture tests use JUnit and Spring Modulith without external infrastructure.
- API tests use MockMvc and verify status, media type, correlation, and safe standardized errors.
- Repository and migration tests use Testcontainers with the exact supported PostgreSQL image. H2 is prohibited because its SQL behavior, types, locking, schemas, and migration behavior differ from PostgreSQL.
- Integration tests carry the JUnit `integration` tag. Testcontainers removes their databases after the JVM exits.

Commands from `backend/`:

```bash
./mvnw test -Dgroups='!integration'
./mvnw test -Dgroups=integration
./mvnw verify
```

Surefire XML and text reports are written under `backend/target/surefire-reports`.

## Frontend

Vitest and React Testing Library cover application routes and accessible rendered behavior. Prefer queries by role and visible name. Mock network boundaries, not shared UI components. Each application writes JUnit output under its local `test-results` directory.

```bash
pnpm --filter @smart-business/portal test
pnpm --filter @smart-business/admin test
```

## Browser smoke tests

Playwright runs Chromium against the containerized routes. The foundation suite verifies both deep links, both backend proxies, the portal offline static shell, and network-only API behavior.

```bash
make compose-up
pnpm --filter @smart-business/e2e exec playwright install chromium
pnpm e2e
```

Override `PORTAL_BASE_URL` and `ADMIN_BASE_URL` only to target another disposable environment. Playwright writes JUnit, HTML, trace, screenshot, and video artifacts in ignored report directories. CI uploads failure artifacts.

## Naming and fixtures

- Name unit tests `*Tests` in Java and `*.test.tsx` in frontend applications.
- Name browser journeys `*.spec.ts`.
- A fixture must be local to a test or immutable. Never depend on execution order.
- Use factories when a domain object requires multiple valid fields; keep only scenario-specific values in the test.
- Clean external state in lifecycle hooks even when an assertion fails. Prefer disposable containers and APIs over shared database cleanup scripts.

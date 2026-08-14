# End-to-End Tests

Playwright verifies the containerized portal, administration application, API proxy, Keycloak BFF
flows, and portal offline shell in Chromium. Browser journeys use Page Object Model: page objects
own routes, selectors, Keycloak credential forms, and session actions; specs own scenarios and
assertions.

Start the complete application profile and run the suite from the repository root:

```bash
make compose-up
pnpm --filter @smart-business/e2e exec playwright install chromium
pnpm e2e
```

`PORTAL_BASE_URL` and `ADMIN_BASE_URL` can target another disposable environment. Tests create no business data and depend only on the platform-foundation placeholders.

## Identity boundary

Run the full identity suite from a clean checkout with Docker available:

```bash
pnpm --filter @smart-business/e2e exec playwright install chromium
make identity-e2e
```

The command creates an isolated Compose project with PostgreSQL, Keycloak, seeded Customer and
Admin identities and dedicated `*.test.localhost` origins. It uses a restart-safe session lifetime
to prove JDBC persistence, then recreates only the backend with brief test-only limits to verify
idle expiry. It removes its network and volume when finished.

Only JUnit and HTML reports are retained. Traces, screenshots, videos, and browser storage-state
files are disabled or temporary because login credentials and session data must never be published.
Before a report is retained, the command rejects configured secrets, tokens, and session-cookie
values. Google sign-in and physical passkey interactions remain documented manual smoke tests.

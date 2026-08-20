# Local Infrastructure

Docker Compose provisions PostgreSQL, Keycloak, Garage, and Mailpit for local development. The infrastructure stack runs independently of application containers. A one-shot `keycloak-config` service reconciles the realm after Keycloak becomes healthy.

## Start and inspect

```bash
make infra-up
docker compose --env-file infra/.env -f infra/compose.yaml ps
make infra-logs
```

Local endpoints:

| Service                   | Endpoint                     |
| ------------------------- | ---------------------------- |
| PostgreSQL                | `localhost:5432`             |
| Keycloak                  | `http://auth.localhost:8081` |
| Garage S3 API             | `http://localhost:3900`      |
| Garage administration API | `http://localhost:3903`      |
| Mailpit SMTP              | `localhost:1025`             |
| Mailpit web UI            | `http://localhost:8025`      |

The committed credentials in `.env.example` are intentionally limited to local development. Copy the file to `.env` to override values; never reuse these credentials in a shared environment.

## Keycloak reconciliation

The version-controlled configuration owns the `smart-business` realm, global
display name, English and Spanish locales, stable platform roles, and these two
confidential clients:

| Client       | Exact local callback                                        |
| ------------ | ----------------------------------------------------------- |
| `portal-bff` | `http://portal.localhost:5173/api/auth/callback/portal-bff` |
| `admin-bff`  | `http://admin.localhost:5174/api/auth/callback/admin-bff`   |

The callbacks use each application's same-origin `/api` route, which the local
Vite server or container proxy forwards to Spring Boot. They never target a
React route. Both clients allow only Authorization Code, require S256 PKCE, and
disable implicit, direct-access, device, CIBA, and service-account grants.

Compose gives Keycloak the `auth.localhost` network alias and runs its HTTP
listener on port `8081` both inside and outside the local network. Consequently,
the browser and the backend container use the same issuer
`http://auth.localhost:8081/realms/smart-business`; this avoids accepting a token
whose issuer differs from the discovery metadata. The isolated test stack uses
the equivalent `auth.test.localhost:18081` alias and port.

`make infra-up` starts the reconciler automatically. It is safe to run again:

```bash
make keycloak-reconcile
```

Reconciliation creates missing configuration and updates owned fields. It does
not import, delete, disable, or rename users. Configuration therefore applies to
an existing persistent realm as well as a clean database.

Run the static and live checks separately when working on identity infrastructure:

```bash
make keycloak-config-check
make keycloak-integration-test
make keycloak-drift-check
```

The integration test uses its own Compose project, PostgreSQL volume, network,
ports, and test environment. It reconciles twice, provisions test-only users,
restarts Keycloak, verifies privacy-safe event metrics, restores the Keycloak
database from a temporary dump, verifies users before reconciliation, and
removes the isolated resources. The test-user service refuses every
configuration profile except `test`.

## Environment promotion

- `infra/.env.example` is the committed template for safe local-development origins and disposable credentials. `infra/.env` is the ignored per-machine copy consumed by `make` and Docker Compose.
- `keycloak/environments/test.env.example` overlays isolated CI/test values and is the only profile containing deterministic test identities.
- `keycloak/environments/deployed.env.example` documents the deployed Keycloak contract. Its `.invalid` hosts and example credentials must be replaced by the deployment platform and secret manager.

Deployed public, callback, and post-logout URLs must be exact HTTPS URLs. Wildcards,
unresolved placeholders, browser-supplied logout targets, and test identity
variables fail validation. Do not provision a shared environment by using the
committed example credential values.

## Persistence and reset

Ordinary restarts preserve data in these explicitly named volumes:

- `smart-business-postgres-data`
- `smart-business-garage-metadata`
- `smart-business-garage-data`
- `smart-business-mailpit-data`

To permanently remove exactly these local volumes, run:

```bash
make infra-reset CONFIRM=delete-smart-business-local-data
```

This operation cannot recover the removed local databases, objects, realm state, or captured messages.

Production backup/restore expectations and the intentionally manual recovery
sequence are documented in
[Identity and Access Operations](../docs/development/identity-operations.md).

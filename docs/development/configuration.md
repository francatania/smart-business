# Configuration and Secret Handling

This document is the source of truth for configuration names, ownership, precedence, and credential handling.

## Profiles and precedence

The backend uses three Spring profiles:

| Profile    | Purpose                                                  | Credential source                                                              |
| ---------- | -------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `local`    | Host and Docker Compose development; the default profile | Safe values from `application-local.yaml`, overridden by environment variables |
| `test`     | Automated tests and disposable Testcontainers databases  | Test-only values and dynamic test properties                                   |
| `deployed` | Any shared or production-like environment                | Required environment variables or the deployment platform's secret manager     |

Spring applies command-line arguments over environment variables, profile files, and common `application.yaml` values. Do not commit a personal profile file. Use exported environment variables or an ignored `.env.local` file consumed by your own shell tooling.

The `deployed` profile intentionally has no confidential defaults. Missing required values stop startup with a configuration-binding or unresolved-placeholder message.

## Backend variables

| Variable                         | Required in `deployed` | Owner    | Description                                                     |
| -------------------------------- | ---------------------- | -------- | --------------------------------------------------------------- |
| `SPRING_PROFILES_ACTIVE`         | Yes                    | Platform | Must be `deployed` outside local development and tests          |
| `SMART_BUSINESS_ENVIRONMENT`     | Yes                    | Platform | Short environment identifier such as `staging` or `production`  |
| `SMART_BUSINESS_PUBLIC_BASE_URL` | Yes                    | Platform | Public portal origin; not a secret                              |
| `DATABASE_URL`                   | Yes                    | Database | PostgreSQL JDBC URL including `currentSchema=smart_business`    |
| `DATABASE_USERNAME`              | Yes                    | Database | Application database user                                       |
| `DATABASE_PASSWORD`              | Yes                    | Database | Application database credential                                 |
| `OIDC_ISSUER_URI`                | Yes                    | Identity | Exact `smart-business` realm issuer used for provider discovery |
| `PORTAL_BFF_CLIENT_SECRET`       | Yes                    | Identity | Portal confidential-client credential                           |
| `PORTAL_BFF_CALLBACK_URI`        | Yes                    | Identity | Exact Portal backend callback URI                               |
| `ADMIN_BFF_CLIENT_SECRET`        | Yes                    | Identity | Administration confidential-client credential                   |
| `ADMIN_BFF_CALLBACK_URI`         | Yes                    | Identity | Exact Administration backend callback URI                       |
| `SERVER_PORT`                    | No                     | Platform | Application HTTP port; defaults to `8080`                       |
| `MANAGEMENT_SERVER_PORT`         | No                     | Platform | Private management port; defaults to `8082`                     |

Garage credentials in `infra/.env.example` are development-only foundations. Shared environments must inject them from a secret manager and rotate them independently.

## Keycloak variables and profiles

Keycloak configuration uses an independent `local`, `test`, or `deployed`
profile. The version-controlled reconciler consumes these variables:

| Variable                         | Secret | Description                                     |
| -------------------------------- | ------ | ----------------------------------------------- |
| `KEYCLOAK_CONFIGURATION_PROFILE` | No     | Safety boundary: `local`, `test`, or `deployed` |
| `KEYCLOAK_PUBLIC_URL`            | No     | Exact public issuer origin                      |
| `KEYCLOAK_ADMIN_USER`            | No     | Administrative reconciliation username          |
| `KEYCLOAK_ADMIN_PASSWORD`        | Yes    | Administrative reconciliation credential        |
| `PORTAL_BFF_CLIENT_SECRET`       | Yes    | Confidential Portal OIDC client credential      |
| `PORTAL_BFF_ORIGIN`              | No     | Exact Portal application origin                 |
| `PORTAL_BFF_CALLBACK_URI`        | No     | Exact Portal backend callback through `/api`    |
| `PORTAL_BFF_POST_LOGOUT_URI`     | No     | Configured Portal logout destination            |
| `ADMIN_BFF_CLIENT_SECRET`        | Yes    | Confidential Admin OIDC client credential       |
| `ADMIN_BFF_ORIGIN`               | No     | Exact Admin application origin                  |
| `ADMIN_BFF_CALLBACK_URI`         | No     | Exact Admin backend callback through `/api`     |
| `ADMIN_BFF_POST_LOGOUT_URI`      | No     | Configured Admin logout destination             |

Local values live in `infra/.env.example`. Automated identity tests load
`infra/keycloak/environments/test.env.example` after that base file. Only the test
overlay defines `KEYCLOAK_TEST_*` identities and credentials; the provisioning
script refuses to run unless the selected profile is exactly `test`.

The deployed example is a contract, not deployable credentials. A deployment
must replace its `.invalid` origins and example credentials through its
configuration and secret stores. All deployed public URLs require HTTPS, and
callback and post-logout destinations must be exact. Wildcards and unresolved
placeholders fail `make keycloak-config-check` and CI.

Client secrets are reconciled to Keycloak but never embedded in frontend code,
stored in the canonical JSON, or printed by the live assertion. Rotate each BFF
secret independently, update the matching backend OIDC registration in the same
deployment, run the reconciler, and verify login before retiring the old
deployment configuration.

The backend normally derives authorization, token, and JWK endpoints from
`OIDC_ISSUER_URI`. `OIDC_AUTHORIZATION_URI`, `OIDC_TOKEN_URI`, and
`OIDC_JWK_SET_URI` are a test-only, all-or-nothing override used to keep Spring
context tests independent from a running identity provider. Shared deployments
must rely on issuer discovery and must not define these overrides.

Callback values must be absolute HTTP(S) URLs with the exact paths
`/api/auth/callback/portal-bff` and `/api/auth/callback/admin-bff`. The deployed
configuration has no fallback issuer, client secret, or callback: missing values
fail backend startup instead of silently using local credentials.

## Frontend variables

Vite embeds environment values into public JavaScript bundles. Therefore only names beginning with `VITE_PUBLIC_` are allowed in frontend source. The current applications accept one optional public value:

| Variable                   | Default | Description                                                |
| -------------------------- | ------- | ---------------------------------------------------------- |
| `VITE_PUBLIC_API_BASE_URL` | `/api`  | Same-origin API prefix or an explicitly public alternative |

Never place passwords, client secrets, access keys, tokens, or private customer values in a Vite variable. The API client sends `credentials: include` and stores no access or refresh token.

## Local overrides and rotation

- Copy examples only when a tool requires a local file; `.env`, `.env.*`, and `*.local` are ignored except committed examples.
- Treat all values in `infra/.env.example` as disposable. Never reuse them outside one developer machine.
- If a real credential is committed or printed, revoke or rotate it first, then remove it from history according to the incident procedure. Deleting the current line is not sufficient.
- Rotation should overlap old and new credentials only when the provider supports a safe dual-key transition. Record the owner, affected environments, and completion time outside the repository.
- Application logs and problem responses must contain correlation identifiers, not credentials, tokens, session cookies, raw request bodies, or customer media.

Run `make secrets-check` to exercise the repository scanner and verify its representative fixture. Run `make configuration-check` after frontend builds to ensure only public configuration appears in source and bundles.

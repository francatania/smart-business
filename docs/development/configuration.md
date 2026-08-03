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

| Variable                         | Required in `deployed` | Owner    | Description                                                    |
| -------------------------------- | ---------------------- | -------- | -------------------------------------------------------------- |
| `SPRING_PROFILES_ACTIVE`         | Yes                    | Platform | Must be `deployed` outside local development and tests         |
| `SMART_BUSINESS_ENVIRONMENT`     | Yes                    | Platform | Short environment identifier such as `staging` or `production` |
| `SMART_BUSINESS_PUBLIC_BASE_URL` | Yes                    | Platform | Public portal origin; not a secret                             |
| `DATABASE_URL`                   | Yes                    | Database | PostgreSQL JDBC URL including `currentSchema=smart_business`   |
| `DATABASE_USERNAME`              | Yes                    | Database | Application database user                                      |
| `DATABASE_PASSWORD`              | Yes                    | Database | Application database credential                                |
| `SERVER_PORT`                    | No                     | Platform | Application HTTP port; defaults to `8080`                      |
| `MANAGEMENT_SERVER_PORT`         | No                     | Platform | Private management port; defaults to `8082`                    |

Keycloak client secrets and Garage credentials in `infra/.env.example` are development-only foundations. They are not consumed by the application until the identity and media epics. Shared environments must inject them from a secret manager and rotate them independently.

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

# Continuous Integration and Security Gates

The `CI` workflow runs on every pull request and on pushes to `main`. Workflow permissions are limited to `contents: read`, obsolete runs on the same ref are cancelled, dependencies are cached through their official setup actions, and every third-party action is pinned to a full commit SHA.

## Required checks

Protect `main` and require these exact checks before merging:

- `Backend`
- `Frontend`
- `API contract`
- `End-to-end`
- `Security`
- `Compose configuration`

Also require pull requests, one approval, resolution of review conversations, dismissal of stale approvals, and the branch to be current before merge. Do not permit force pushes or branch deletion.

## What fails the build

- Java compilation, formatting, unit, module-boundary, migration, or PostgreSQL integration failures.
- Frontend formatting, lint, type, component-test, or production-build failures.
- A regenerated OpenAPI contract or TypeScript client that differs from the committed files.
- Chromium smoke failures in either application, the PWA offline shell, or network-only API behavior.
- Invalid Compose configuration or unhealthy application containers.
- Representative secrets, Gitleaks findings, or high/critical dependency vulnerabilities.

Test reports and relevant logs are uploaded even when a job fails. Playwright retains traces, screenshots, and videos only for failed attempts.

## Dependency exceptions

The default policy has no vulnerability exceptions. A temporary exception requires an entry in `security/dependency-exceptions.json` with the advisory identifier, a concrete reason, an accountable owner, and an ISO date in `expires`. CI rejects missing fields and expired entries. The pull request granting an exception must also configure the scanner narrowly for that identifier and link the remediation issue. Broad package, directory, or severity exclusions are not allowed.

Dependabot proposes Maven, pnpm, GitHub Actions, and Docker updates each Monday. Exact application and image versions remain unchanged until an update pull request passes all required checks.

## Local parity

`make verify` runs backend and frontend verification, configuration and secret checks, Compose validation, API drift checks, Chromium smoke tests, and the same vulnerability scanners. It expects Docker to be available and leaves the local application stack running for troubleshooting. Use `make infra-down` when finished; it preserves named data volumes.

`make verify-clean-checkout` archives tracked files into a validated temporary directory, runs both toolchains with their pinned containers, verifies Compose, and builds all application images without using local build output. It never starts or removes the persistent infrastructure volumes.

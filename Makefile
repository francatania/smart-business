.DEFAULT_GOAL := help

COMPOSE_ENV_FILE ?= infra/.env

.PHONY: help setup local-config infra-up infra-down infra-logs infra-reset backend-run portal-dev admin-dev api-generate format test test-fast test-integration e2e verify verify-clean-checkout app-up app-down compose-up secrets-check configuration-check security-check keycloak-config-check keycloak-reconcile keycloak-google-check keycloak-integration-test

help:
	@echo "Smart Business development commands"
	@echo "  make setup          Enable pnpm and install JavaScript dependencies"
	@echo "  make infra-up       Start local infrastructure"
	@echo "  make infra-down     Stop local infrastructure"
	@echo "  make infra-logs     Follow infrastructure logs"
	@echo "  make backend-run    Run the Spring Boot backend on the host"
	@echo "  make portal-dev     Run the portal development server"
	@echo "  make admin-dev      Run the administration development server"
	@echo "  make app-up         Build and start the complete application stack"
	@echo "  make app-down       Stop and remove the complete application stack"
	@echo "  make compose-up     Alias for make app-up"
	@echo "  make api-generate   Regenerate the OpenAPI TypeScript client"
	@echo "  make secrets-check  Scan for representative committed-secret patterns"
	@echo "  make keycloak-config-check Validate canonical and environment Keycloak settings"
	@echo "  make keycloak-reconcile Reapply local Keycloak realm and BFF client settings"
	@echo "  make keycloak-google-check Verify the configured local Google identity provider"
	@echo "  make keycloak-integration-test Test reconciliation against isolated Keycloak"
	@echo "  make security-check Run Git-history and dependency vulnerability scans"
	@echo "  make format         Format supported repository files"
	@echo "  make test           Run backend and frontend tests"
	@echo "  make test-fast      Run tests that require no external service"
	@echo "  make test-integration Run PostgreSQL integration tests"
	@echo "  make e2e            Run Playwright against the containerized applications"
	@echo "  make verify         Run the local CI-equivalent verification"
	@echo "  make verify-clean-checkout Verify tracked files in an isolated temporary checkout"
	@echo "  make infra-reset    Delete named local development volumes (confirmation required)"

setup:
	$(MAKE) local-config
	corepack enable
	corepack prepare pnpm@10.34.0 --activate
	pnpm install

local-config:
	@test -f "$(COMPOSE_ENV_FILE)" || cp infra/.env.example "$(COMPOSE_ENV_FILE)"

infra-up: local-config
	docker compose --env-file $(COMPOSE_ENV_FILE) -f infra/compose.yaml up -d

infra-down: local-config
	docker compose --env-file $(COMPOSE_ENV_FILE) -f infra/compose.yaml down

infra-logs: local-config
	docker compose --env-file $(COMPOSE_ENV_FILE) -f infra/compose.yaml logs -f

infra-reset: local-config
	@test "$(CONFIRM)" = "delete-smart-business-local-data" || (echo "Refusing to delete local volumes. Re-run with CONFIRM=delete-smart-business-local-data" && exit 1)
	docker compose --env-file $(COMPOSE_ENV_FILE) -f infra/compose.yaml down --volumes

backend-run:
	cd backend && ./mvnw spring-boot:run

portal-dev:
	pnpm --filter @smart-business/portal dev

admin-dev:
	pnpm --filter @smart-business/admin dev

app-up: local-config
	docker compose --env-file $(COMPOSE_ENV_FILE) -f infra/compose.yaml --profile applications up -d --build

app-down: local-config
	docker compose --env-file $(COMPOSE_ENV_FILE) -f infra/compose.yaml --profile applications down

compose-up: app-up

api-generate:
	pnpm api:generate

secrets-check:
	./scripts/test-secret-scanner.sh
	./scripts/verify-no-secrets.sh

configuration-check:
	./scripts/verify-public-frontend-config.sh

keycloak-config-check: local-config
	node scripts/validate-keycloak-config.mjs
	node scripts/test-keycloak-config-validator.mjs
	docker compose --env-file $(COMPOSE_ENV_FILE) -f infra/compose.yaml --profile identity-test config --quiet

keycloak-reconcile: keycloak-config-check
	docker compose --env-file $(COMPOSE_ENV_FILE) -f infra/compose.yaml run --rm keycloak-config

keycloak-google-check: local-config
	set -a; . "$(COMPOSE_ENV_FILE)"; set +a; KEYCLOAK_ASSERT_URL="$$KEYCLOAK_PUBLIC_URL" KEYCLOAK_EXPECT_GOOGLE=true node scripts/assert-keycloak-realm.mjs

keycloak-integration-test: keycloak-config-check
	./scripts/test-keycloak-reconciliation.sh

security-check: secrets-check
	node scripts/verify-security-exceptions.mjs
	docker run --rm --volume "$(CURDIR):/repo" zricethezav/gitleaks:v8.30.1 detect --source=/repo --no-banner --redact
	cd backend && ./mvnw --batch-mode --no-transfer-progress -DskipTests package
	docker run --rm --volume smart-business-trivy-cache:/root/.cache/trivy --volume "$(CURDIR):/repo" aquasec/trivy:0.73.0 --quiet rootfs --offline-scan --ignorefile /repo/.trivyignore --scanners vuln --severity HIGH,CRITICAL --exit-code 1 /repo/backend/target/backend-0.1.0-SNAPSHOT.jar
	docker run --rm --volume smart-business-trivy-cache:/root/.cache/trivy --volume "$(CURDIR):/repo" aquasec/trivy:0.73.0 --quiet fs --offline-scan --ignorefile /repo/.trivyignore --scanners vuln --severity HIGH,CRITICAL --exit-code 1 /repo/pnpm-lock.yaml

format:
	cd backend && ./mvnw spotless:apply
	pnpm format

test:
	cd backend && ./mvnw test
	pnpm test

test-fast:
	cd backend && ./mvnw test -Dgroups='!integration'
	pnpm test

test-integration:
	cd backend && ./mvnw test -Dgroups=integration

e2e:
	pnpm e2e

verify:
	cd backend && ./mvnw verify
	pnpm verify
	$(MAKE) secrets-check
	$(MAKE) configuration-check
	$(MAKE) keycloak-integration-test
	docker compose --env-file infra/.env.example -f infra/compose.yaml config --quiet
	docker compose --env-file infra/.env.example -f infra/compose.yaml --profile applications up -d --build --wait
	pnpm api:check
	pnpm e2e
	$(MAKE) security-check

verify-clean-checkout:
	./scripts/verify-clean-checkout.sh

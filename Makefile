.DEFAULT_GOAL := help

.PHONY: help setup infra-up infra-down infra-logs infra-reset backend-run portal-dev admin-dev api-generate format test test-fast test-integration e2e verify compose-up secrets-check configuration-check

help:
	@echo "Smart Business development commands"
	@echo "  make setup          Enable pnpm and install JavaScript dependencies"
	@echo "  make infra-up       Start local infrastructure"
	@echo "  make infra-down     Stop local infrastructure"
	@echo "  make infra-logs     Follow infrastructure logs"
	@echo "  make backend-run    Run the Spring Boot backend on the host"
	@echo "  make portal-dev     Run the portal development server"
	@echo "  make admin-dev      Run the administration development server"
	@echo "  make compose-up     Start infrastructure and optional application containers"
	@echo "  make api-generate   Regenerate the OpenAPI TypeScript client"
	@echo "  make secrets-check  Scan for representative committed-secret patterns"
	@echo "  make format         Format supported repository files"
	@echo "  make test           Run backend and frontend tests"
	@echo "  make test-fast      Run tests that require no external service"
	@echo "  make test-integration Run PostgreSQL integration tests"
	@echo "  make e2e            Run Playwright against the containerized applications"
	@echo "  make verify         Run the local CI-equivalent verification"
	@echo "  make infra-reset    Delete named local development volumes (confirmation required)"

setup:
	corepack enable
	corepack prepare pnpm@10.34.0 --activate
	pnpm install

infra-up:
	docker compose --env-file infra/.env.example -f infra/compose.yaml up -d

infra-down:
	docker compose --env-file infra/.env.example -f infra/compose.yaml down

infra-logs:
	docker compose --env-file infra/.env.example -f infra/compose.yaml logs -f

infra-reset:
	@test "$(CONFIRM)" = "delete-smart-business-local-data" || (echo "Refusing to delete local volumes. Re-run with CONFIRM=delete-smart-business-local-data" && exit 1)
	docker compose --env-file infra/.env.example -f infra/compose.yaml down --volumes

backend-run:
	cd backend && ./mvnw spring-boot:run

portal-dev:
	pnpm --filter @smart-business/portal dev

admin-dev:
	pnpm --filter @smart-business/admin dev

compose-up:
	docker compose --env-file infra/.env.example -f infra/compose.yaml --profile applications up -d --build

api-generate:
	pnpm api:generate

secrets-check:
	./scripts/test-secret-scanner.sh
	./scripts/verify-no-secrets.sh

configuration-check:
	./scripts/verify-public-frontend-config.sh

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
	docker compose --env-file infra/.env.example -f infra/compose.yaml config --quiet

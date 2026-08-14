#!/usr/bin/env bash
set -euo pipefail

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
project="smart-business-identity-e2e-$$"
base_environment="$repository_root/infra/.env.example"
test_environment="$repository_root/infra/keycloak/environments/test.env.example"
compose_file="$repository_root/infra/compose.yaml"

set -a
# shellcheck disable=SC1090
source "$base_environment"
# shellcheck disable=SC1090
source "$test_environment"
POSTGRES_DATA_VOLUME="$project-postgres-data"
PLATFORM_NETWORK_NAME="$project-platform"
PORTAL_BASE_URL="$PORTAL_BFF_ORIGIN"
ADMIN_BASE_URL="$ADMIN_BFF_ORIGIN"
IDENTITY_E2E=true
IDENTITY_E2E_COMPOSE_PROJECT="$project"
set +a

compose=(
  docker compose
  --project-name "$project"
  --env-file "$base_environment"
  --env-file "$test_environment"
  -f "$compose_file"
)
artifact_directory="$repository_root/frontend/e2e/test-results"
compose_log="$artifact_directory/compose-identity-e2e.log"

if command -v pnpm >/dev/null 2>&1; then
  pnpm_command=(pnpm)
elif command -v corepack >/dev/null 2>&1; then
  pnpm_command=(corepack pnpm)
else
  echo 'pnpm is required. Install the repository toolchain with make setup.' >&2
  exit 1
fi

cleanup() {
  "${compose[@]}" --profile applications --profile identity-test down --volumes --remove-orphans >/dev/null 2>&1 || true
}

capture_logs() {
  mkdir -p "$artifact_directory"
  "${compose[@]}" logs --no-color > "$compose_log" 2>&1 || true
}

verify_artifacts() {
  if node "$repository_root/scripts/verify-identity-e2e-artifacts.mjs" \
    frontend/e2e/test-results frontend/e2e/playwright-report; then
    return
  fi
  rm -rf "$artifact_directory" "$repository_root/frontend/e2e/playwright-report"
  return 1
}

trap cleanup EXIT

if ! "${compose[@]}" --profile applications up -d --build --wait \
  postgres keycloak keycloak-config backend portal admin; then
  capture_logs
  "${compose[@]}" logs --no-color keycloak-config >&2 || true
  verify_artifacts || true
  exit 1
fi
"${compose[@]}" --profile identity-test run --rm --no-deps keycloak-test-users

if ! (
  cd "$repository_root"
  export PORTAL_BASE_URL ADMIN_BASE_URL IDENTITY_E2E IDENTITY_E2E_COMPOSE_PROJECT
  export KEYCLOAK_TEST_CUSTOMER_USERNAME KEYCLOAK_TEST_CUSTOMER_PASSWORD
  export KEYCLOAK_TEST_ADMIN_USERNAME KEYCLOAK_TEST_ADMIN_PASSWORD
  "${pnpm_command[@]}" e2e
); then
  capture_logs
  verify_artifacts || true
  exit 1
fi

verify_artifacts

echo 'Identity E2E tests passed against isolated Keycloak and PostgreSQL services.'

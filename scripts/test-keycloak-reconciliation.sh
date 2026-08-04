#!/usr/bin/env bash
set -euo pipefail

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
project="smart-business-keycloak-test-$$"
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
set +a

compose=(
  docker compose
  --project-name "$project"
  --env-file "$base_environment"
  --env-file "$test_environment"
  -f "$compose_file"
)

cleanup() {
  "${compose[@]}" --profile identity-test down --volumes --remove-orphans >/dev/null 2>&1 || true
}

failure_logs() {
  echo 'Keycloak integration test failed. Capturing isolated service logs.' >&2
  "${compose[@]}" logs --no-color postgres keycloak keycloak-config 2>/dev/null || true
}

trap cleanup EXIT
trap failure_logs ERR

node "$repository_root/scripts/validate-keycloak-config.mjs"
"${compose[@]}" up -d --wait postgres keycloak

# Running twice proves the reconciler updates rather than relying on empty-database import.
"${compose[@]}" run --rm keycloak-config
"${compose[@]}" run --rm keycloak-config

KEYCLOAK_ASSERT_URL="http://127.0.0.1:$KEYCLOAK_PORT" \
  node "$repository_root/scripts/assert-keycloak-realm.mjs"

"${compose[@]}" --profile identity-test run --rm --no-deps keycloak-test-users
"${compose[@]}" --profile identity-test run --rm --no-deps keycloak-test-users
KEYCLOAK_ASSERT_URL="http://127.0.0.1:$KEYCLOAK_PORT" \
  KEYCLOAK_EXPECT_TEST_USERS=true \
  node "$repository_root/scripts/assert-keycloak-realm.mjs"

# A server restart and another reconciliation must preserve test identities.
"${compose[@]}" restart keycloak
"${compose[@]}" up -d --wait keycloak
"${compose[@]}" run --rm keycloak-config
KEYCLOAK_ASSERT_URL="http://127.0.0.1:$KEYCLOAK_PORT" \
  KEYCLOAK_EXPECT_TEST_USERS=true \
  node "$repository_root/scripts/assert-keycloak-realm.mjs"

if "${compose[@]}" --profile identity-test run --rm --no-deps \
  -e KEYCLOAK_CONFIGURATION_PROFILE=deployed keycloak-test-users >/dev/null 2>&1; then
  echo 'Test identity provisioning did not refuse the deployed profile.' >&2
  exit 1
fi

trap - ERR
echo 'Keycloak reconciliation, persistence, and test-profile isolation passed.'

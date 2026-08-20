#!/usr/bin/env bash
set -euo pipefail

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
project="smart-business-keycloak-test-$$"
base_environment="$repository_root/infra/.env.example"
test_environment="$repository_root/infra/keycloak/environments/test.env.example"
compose_file="$repository_root/infra/compose.yaml"
backup_directory="$(mktemp -d /tmp/smart-business-keycloak-backup-XXXXXX)"
backup_file="$backup_directory/keycloak.dump"

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
  rm -f "$backup_file"
  rmdir "$backup_directory" 2>/dev/null || true
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
  KEYCLOAK_EXPECT_GOOGLE=false \
  node "$repository_root/scripts/assert-keycloak-realm.mjs"

token_error_status="$(curl --silent --output /dev/null --write-out '%{http_code}' \
  --request POST \
  --user "portal-bff:$PORTAL_BFF_CLIENT_SECRET" \
  --data-urlencode grant_type=authorization_code \
  --data-urlencode code=invalid-identity-operations-code \
  --data-urlencode redirect_uri="$PORTAL_BFF_CALLBACK_URI" \
  "http://127.0.0.1:$KEYCLOAK_PORT/realms/smart-business/protocol/openid-connect/token")"
if [[ "$token_error_status" != '400' ]]; then
  echo "The controlled invalid token exchange returned $token_error_status instead of 400." >&2
  exit 1
fi

keycloak_metrics="$("${compose[@]}" exec -T keycloak bash -c \
  "exec 3<>/dev/tcp/127.0.0.1/9000; printf 'GET /metrics HTTP/1.1\\r\\nHost: localhost\\r\\nConnection: close\\r\\n\\r\\n' >&3; cat <&3")"
event_metric="$(printf '%s\n' "$keycloak_metrics" \
  | grep 'keycloak_user_events_total' \
  | grep 'realm="smart-business"' \
  | grep 'client_id="portal-bff"' \
  | grep 'event="code_to_token"' \
  | grep -E 'error="[^"]+"' \
  | head -n 1)"
if [[ -z "$event_metric" ]]; then
  echo 'The controlled OIDC error did not produce a Keycloak user-event metric.' >&2
  exit 1
fi
if [[ "$event_metric" =~ (email|session_id|subject|user_id|username)= ]]; then
  echo 'Keycloak user-event metrics contain a personal or session identifier.' >&2
  exit 1
fi

"${compose[@]}" --profile identity-test run --rm --no-deps keycloak-test-users
"${compose[@]}" --profile identity-test run --rm --no-deps keycloak-test-users
KEYCLOAK_ASSERT_URL="http://127.0.0.1:$KEYCLOAK_PORT" \
  KEYCLOAK_EXPECT_TEST_USERS=true \
  KEYCLOAK_EXPECT_GOOGLE=false \
  node "$repository_root/scripts/assert-keycloak-realm.mjs"

# A server restart and another reconciliation must preserve test identities.
"${compose[@]}" restart keycloak
"${compose[@]}" up -d --wait keycloak
"${compose[@]}" run --rm keycloak-config
KEYCLOAK_ASSERT_URL="http://127.0.0.1:$KEYCLOAK_PORT" \
  KEYCLOAK_EXPECT_TEST_USERS=true \
  KEYCLOAK_EXPECT_GOOGLE=false \
  node "$repository_root/scripts/assert-keycloak-realm.mjs"

if "${compose[@]}" --profile identity-test run --rm --no-deps \
  -e KEYCLOAK_CONFIGURATION_PROFILE=deployed keycloak-test-users >/dev/null 2>&1; then
  echo 'Test identity provisioning did not refuse the deployed profile.' >&2
  exit 1
fi

"${compose[@]}" exec -T -e PGPASSWORD="$KEYCLOAK_DATABASE_PASSWORD" postgres \
  pg_dump --username="$KEYCLOAK_DATABASE_USER" --dbname="$KEYCLOAK_DATABASE" \
  --format=custom --no-owner --no-privileges > "$backup_file"
if [[ ! -s "$backup_file" ]]; then
  echo 'The isolated Keycloak database backup is empty.' >&2
  exit 1
fi

"${compose[@]}" stop keycloak >/dev/null
"${compose[@]}" exec -T -e PGPASSWORD="$POSTGRES_ADMIN_PASSWORD" postgres \
  dropdb --username="$POSTGRES_ADMIN_USER" --force "$KEYCLOAK_DATABASE"
"${compose[@]}" exec -T -e PGPASSWORD="$POSTGRES_ADMIN_PASSWORD" postgres \
  createdb --username="$POSTGRES_ADMIN_USER" --owner="$KEYCLOAK_DATABASE_USER" \
  --template=template0 "$KEYCLOAK_DATABASE"
"${compose[@]}" exec -T -e PGPASSWORD="$KEYCLOAK_DATABASE_PASSWORD" postgres \
  pg_restore --username="$KEYCLOAK_DATABASE_USER" --dbname="$KEYCLOAK_DATABASE" \
  --exit-on-error --no-owner --no-privileges < "$backup_file"

"${compose[@]}" up -d --wait keycloak
KEYCLOAK_ASSERT_URL="http://127.0.0.1:$KEYCLOAK_PORT" \
  KEYCLOAK_EXPECT_TEST_USERS=true \
  KEYCLOAK_EXPECT_GOOGLE=false \
  node "$repository_root/scripts/assert-keycloak-realm.mjs"

"${compose[@]}" run --rm keycloak-config
KEYCLOAK_ASSERT_URL="http://127.0.0.1:$KEYCLOAK_PORT" \
  KEYCLOAK_EXPECT_TEST_USERS=true \
  KEYCLOAK_EXPECT_GOOGLE=false \
  node "$repository_root/scripts/assert-keycloak-realm.mjs"

trap - ERR
echo 'Keycloak reconciliation, event metrics, backup recovery, and test-profile isolation passed.'

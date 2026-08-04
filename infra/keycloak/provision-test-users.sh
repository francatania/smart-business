#!/usr/bin/env bash
set -euo pipefail

realm='smart-business'
kcadm='/opt/keycloak/bin/kcadm.sh'
credential_file="${HOME:-/opt/keycloak}/.keycloak/kcadm.config"

cleanup_credentials() {
  rm -f "$credential_file"
}
trap cleanup_credentials EXIT

if [[ "${KEYCLOAK_CONFIGURATION_PROFILE:-}" != 'test' ]]; then
  echo 'Refusing to provision test identities outside the test configuration profile.' >&2
  exit 1
fi

for variable in \
  KEYCLOAK_ADMIN_URL KEYCLOAK_ADMIN_USER KEYCLOAK_ADMIN_PASSWORD \
  KEYCLOAK_TEST_CUSTOMER_USERNAME KEYCLOAK_TEST_CUSTOMER_PASSWORD \
  KEYCLOAK_TEST_ADMIN_USERNAME KEYCLOAK_TEST_ADMIN_PASSWORD; do
  if [[ -z "${!variable:-}" ]]; then
    echo "Required test identity configuration is missing: $variable" >&2
    exit 1
  fi
done

"$kcadm" config credentials \
  --server "$KEYCLOAK_ADMIN_URL" \
  --realm master \
  --user "$KEYCLOAK_ADMIN_USER" \
  --password "$KEYCLOAK_ADMIN_PASSWORD" >/dev/null

find_user_uuid() {
  local username="$1"
  "$kcadm" get users -r "$realm" -q "username=$username" -q exact=true \
    --fields id --format csv --noquotes 2>/dev/null | sed -n '1{s/,.*//;s/\r$//;p;}'
}

upsert_user() {
  local username="$1"
  local password="$2"
  local display_name="$3"
  local user_uuid
  user_uuid="$(find_user_uuid "$username")"

  if [[ -z "$user_uuid" ]]; then
    "$kcadm" create users -r "$realm" \
      -s "username=$username" \
      -s "email=$username@example.invalid" \
      -s "firstName=$display_name" \
      -s lastName=User \
      -s enabled=true \
      -s emailVerified=true >/dev/null
    user_uuid="$(find_user_uuid "$username")"
  else
    "$kcadm" update "users/$user_uuid" -r "$realm" \
      -s "email=$username@example.invalid" \
      -s "firstName=$display_name" \
      -s lastName=User \
      -s enabled=true \
      -s emailVerified=true >/dev/null
  fi

  "$kcadm" set-password -r "$realm" --userid "$user_uuid" \
    --new-password "$password" >/dev/null
}

upsert_user "$KEYCLOAK_TEST_CUSTOMER_USERNAME" "$KEYCLOAK_TEST_CUSTOMER_PASSWORD" 'Customer Test'
upsert_user "$KEYCLOAK_TEST_ADMIN_USERNAME" "$KEYCLOAK_TEST_ADMIN_PASSWORD" 'Administrator Test'

"$kcadm" add-roles -r "$realm" \
  --uusername "$KEYCLOAK_TEST_ADMIN_USERNAME" \
  --rolename platform_admin >/dev/null

echo 'Keycloak test identities were provisioned in the isolated test profile.'

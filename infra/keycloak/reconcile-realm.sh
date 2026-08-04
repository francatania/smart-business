#!/usr/bin/env bash
set -euo pipefail

realm='smart-business'
kcadm='/opt/keycloak/bin/kcadm.sh'
credential_file="${HOME:-/opt/keycloak}/.keycloak/kcadm.config"

cleanup_credentials() {
  rm -f "$credential_file"
}
trap cleanup_credentials EXIT

require_variable() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "Required Keycloak configuration is missing: $name" >&2
    exit 1
  fi
}

for variable in \
  KEYCLOAK_ADMIN_URL KEYCLOAK_ADMIN_USER KEYCLOAK_ADMIN_PASSWORD \
  KEYCLOAK_CONFIGURATION_PROFILE KEYCLOAK_PUBLIC_URL \
  PORTAL_BFF_CLIENT_SECRET PORTAL_BFF_ORIGIN PORTAL_BFF_CALLBACK_URI \
  PORTAL_BFF_POST_LOGOUT_URI ADMIN_BFF_CLIENT_SECRET ADMIN_BFF_ORIGIN \
  ADMIN_BFF_CALLBACK_URI ADMIN_BFF_POST_LOGOUT_URI; do
  require_variable "$variable"
done

case "$KEYCLOAK_CONFIGURATION_PROFILE" in
  local | test | deployed) ;;
  *)
    echo "Unsupported Keycloak configuration profile: $KEYCLOAK_CONFIGURATION_PROFILE" >&2
    exit 1
    ;;
esac

for public_value in \
  "$KEYCLOAK_PUBLIC_URL" "$PORTAL_BFF_ORIGIN" "$PORTAL_BFF_CALLBACK_URI" \
  "$PORTAL_BFF_POST_LOGOUT_URI" "$ADMIN_BFF_ORIGIN" \
  "$ADMIN_BFF_CALLBACK_URI" "$ADMIN_BFF_POST_LOGOUT_URI"; do
  if [[ "$public_value" == *'*'* || "$public_value" == *'\\'* || "$public_value" =~ [[:space:]] ]]; then
    echo 'Keycloak public URLs must be exact and must not contain wildcards, backslashes, or whitespace.' >&2
    exit 1
  fi
  if [[ "$KEYCLOAK_CONFIGURATION_PROFILE" == 'deployed' && "$public_value" != https://* ]]; then
    echo 'Every deployed Keycloak public URL must use HTTPS.' >&2
    exit 1
  fi
done

validate_origin() {
  local variable_name="$1"
  local value="${!variable_name}"
  local authority="${value#*://}"
  if [[ "$value" != http://* && "$value" != https://* ]] || [[ "$authority" == */* ]]; then
    echo "$variable_name must be an exact origin without a path." >&2
    exit 1
  fi
}

validate_origin KEYCLOAK_PUBLIC_URL
validate_origin PORTAL_BFF_ORIGIN
validate_origin ADMIN_BFF_ORIGIN

if [[ "$PORTAL_BFF_CALLBACK_URI" != "$PORTAL_BFF_ORIGIN/api/auth/callback/portal-bff" ]] || \
  [[ "$PORTAL_BFF_POST_LOGOUT_URI" != "$PORTAL_BFF_ORIGIN/" ]]; then
  echo 'Portal callback and post-logout URLs must exactly match the configured Portal origin.' >&2
  exit 1
fi
if [[ "$ADMIN_BFF_CALLBACK_URI" != "$ADMIN_BFF_ORIGIN/api/auth/callback/admin-bff" ]] || \
  [[ "$ADMIN_BFF_POST_LOGOUT_URI" != "$ADMIN_BFF_ORIGIN/" ]]; then
  echo 'Admin callback and post-logout URLs must exactly match the configured Admin origin.' >&2
  exit 1
fi

authenticate() {
  local attempt
  for attempt in {1..12}; do
    if "$kcadm" config credentials \
      --server "$KEYCLOAK_ADMIN_URL" \
      --realm master \
      --user "$KEYCLOAK_ADMIN_USER" \
      --password "$KEYCLOAK_ADMIN_PASSWORD" >/dev/null 2>&1; then
      return
    fi
    sleep 2
  done
  echo 'Keycloak became healthy but administration authentication did not succeed.' >&2
  exit 1
}

upsert_role() {
  local role_name="$1"
  local description="$2"
  if "$kcadm" get "roles/$role_name" -r "$realm" >/dev/null 2>&1; then
    "$kcadm" update "roles/$role_name" -r "$realm" \
      -s "description=$description" >/dev/null
  else
    "$kcadm" create roles -r "$realm" \
      -s "name=$role_name" \
      -s "description=$description" >/dev/null
  fi
}

find_client_uuid() {
  local client_id="$1"
  "$kcadm" get clients -r "$realm" -q "clientId=$client_id" \
    --fields id --format csv --noquotes 2>/dev/null | sed -n '1{s/,.*//;s/\r$//;p;}'
}

upsert_client() {
  local client_id="$1"
  local client_name="$2"
  local secret="$3"
  local origin="$4"
  local callback_uri="$5"
  local post_logout_uri="$6"
  local client_uuid
  local operation
  local resource

  client_uuid="$(find_client_uuid "$client_id")"
  if [[ -n "$client_uuid" ]]; then
    operation='update'
    resource="clients/$client_uuid"
  else
    operation='create'
    resource='clients'
  fi

  "$kcadm" "$operation" "$resource" -r "$realm" \
    -s "clientId=$client_id" \
    -s "name=$client_name" \
    -s enabled=true \
    -s clientAuthenticatorType=client-secret \
    -s "secret=$secret" \
    -s publicClient=false \
    -s bearerOnly=false \
    -s standardFlowEnabled=true \
    -s implicitFlowEnabled=false \
    -s directAccessGrantsEnabled=false \
    -s serviceAccountsEnabled=false \
    -s fullScopeAllowed=false \
    -s frontchannelLogout=false \
    -s "rootUrl=$origin" \
    -s "baseUrl=$origin/" \
    -s "adminUrl=$origin" \
    -s "redirectUris=[\"$callback_uri\"]" \
    -s "webOrigins=[\"$origin\"]" \
    -s "attributes={\"post.logout.redirect.uris\":\"$post_logout_uri\",\"pkce.code.challenge.method\":\"S256\",\"oauth2.device.authorization.grant.enabled\":\"false\",\"oidc.ciba.grant.enabled\":\"false\"}" \
    >/dev/null
}

authenticate

if ! "$kcadm" get "realms/$realm" >/dev/null 2>&1; then
  "$kcadm" create realms -s "realm=$realm" -s enabled=true >/dev/null
fi

"$kcadm" update "realms/$realm" \
  -s enabled=true \
  -s 'displayName=Smart Business' \
  -s internationalizationEnabled=true \
  -s 'supportedLocales=["en","es"]' \
  -s defaultLocale=en \
  -s registrationAllowed=false \
  -s resetPasswordAllowed=false \
  -s rememberMe=false \
  -s loginWithEmailAllowed=true \
  -s duplicateEmailsAllowed=false \
  -s verifyEmail=false \
  >/dev/null

upsert_role platform_admin 'Stable platform-wide administrator privilege'
upsert_role support_agent 'Reserved stable platform-wide support privilege'

upsert_client \
  portal-bff 'Portal BFF' "$PORTAL_BFF_CLIENT_SECRET" \
  "$PORTAL_BFF_ORIGIN" "$PORTAL_BFF_CALLBACK_URI" "$PORTAL_BFF_POST_LOGOUT_URI"
upsert_client \
  admin-bff 'Administration BFF' "$ADMIN_BFF_CLIENT_SECRET" \
  "$ADMIN_BFF_ORIGIN" "$ADMIN_BFF_CALLBACK_URI" "$ADMIN_BFF_POST_LOGOUT_URI"

echo "Keycloak realm reconciliation completed for profile $KEYCLOAK_CONFIGURATION_PROFILE."

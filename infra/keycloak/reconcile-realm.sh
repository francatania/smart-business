#!/usr/bin/env bash
set -euo pipefail

realm='smart-business'
passkey_browser_flow='smart-business-browser'
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

find_client_scope_uuid() {
  local scope_name="$1"
  local scope_uuid
  local candidate_name

  while IFS=, read -r scope_uuid candidate_name; do
    candidate_name="${candidate_name%$'\r'}"
    if [[ "$candidate_name" == "$scope_name" ]]; then
      printf '%s\n' "$scope_uuid"
      return
    fi
  done < <(
    "$kcadm" get client-scopes -r "$realm" \
      --fields id,name --format csv --noquotes 2>/dev/null
  )
}

grant_default_client_scope() {
  local client_id="$1"
  local scope_name="$2"
  local client_uuid
  local scope_uuid

  client_uuid="$(find_client_uuid "$client_id")"
  scope_uuid="$(find_client_scope_uuid "$scope_name")"
  if [[ -z "$client_uuid" || -z "$scope_uuid" ]]; then
    echo "Required Keycloak client scope is unavailable: $scope_name for $client_id" >&2
    exit 1
  fi

  "$kcadm" update "clients/$client_uuid/default-client-scopes/$scope_uuid" -r "$realm" >/dev/null
}

find_client_scope_protocol_mapper_uuid() {
  local scope_uuid="$1"
  local mapper_name="$2"
  local line
  local compact_line
  local mapper_uuid
  local compact_mapper_name="${mapper_name// /}"

  while IFS= read -r line; do
    compact_line="${line// /}"
    compact_line="${compact_line//$'\t'/}"
    if [[ "$compact_line" == *'"id"'* ]]; then
      mapper_uuid="${compact_line#*\"id\":\"}"
      mapper_uuid="${mapper_uuid%%\"*}"
    fi
    if [[ "$compact_line" == *"\"name\":\"$compact_mapper_name\""* ]]; then
      if [[ -z "$mapper_uuid" ]]; then
        echo "Keycloak returned the realm roles mapper without an ID." >&2
        return
      fi
      printf '%s\n' "$mapper_uuid"
      return
    fi
  done < <(
    "$kcadm" get "client-scopes/$scope_uuid/protocol-mappers/models" -r "$realm" \
      2>/dev/null
  )
}

grant_realm_role_to_client_scope() {
  local scope_name="$1"
  local role_name="$2"
  local scope_uuid
  local role_payload

  scope_uuid="$(find_client_scope_uuid "$scope_name")"
  if [[ -z "$scope_uuid" ]]; then
    echo "Required Keycloak client scope is unavailable: $scope_name" >&2
    exit 1
  fi
  if "$kcadm" get "client-scopes/$scope_uuid/scope-mappings/realm" -r "$realm" \
    | grep -Fq "\"name\" : \"$role_name\""; then
    return
  fi

  role_payload="/tmp/keycloak-$scope_uuid-$role_name.json"
  {
    printf '['
    "$kcadm" get "roles/$role_name" -r "$realm"
    printf ']'
  } > "$role_payload"
  if ! "$kcadm" create "client-scopes/$scope_uuid/scope-mappings/realm" -r "$realm" \
    -f "$role_payload" >/dev/null; then
    rm -f "$role_payload"
    echo "Unable to grant Keycloak realm role $role_name to client scope $scope_name." >&2
    exit 1
  fi
  rm -f "$role_payload"
}

include_realm_roles_in_id_tokens() {
  local scope_uuid
  local mapper_uuid
  local mapper_names

  scope_uuid="$(find_client_scope_uuid roles)"
  if [[ -z "$scope_uuid" ]]; then
    echo 'The built-in Keycloak roles client scope is unavailable.' >&2
    exit 1
  fi
  mapper_uuid="$(find_client_scope_protocol_mapper_uuid "$scope_uuid" 'realm roles')"
  if [[ -z "$mapper_uuid" ]]; then
    mapper_names="$(
      "$kcadm" get "client-scopes/$scope_uuid/protocol-mappers/models" -r "$realm" 2>/dev/null \
        | sed -n 's/.*"name"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p'
    )"
    echo "Available Keycloak roles-scope mappers: ${mapper_names:-none}." >&2
    echo 'The built-in Keycloak realm roles mapper is unavailable.' >&2
    exit 1
  fi

  "$kcadm" update "client-scopes/$scope_uuid/protocol-mappers/models/$mapper_uuid" -r "$realm" \
    -s 'config."id.token.claim"=true' >/dev/null
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

reconcile_google_identity_provider() {
  local client_id="${GOOGLE_OAUTH_CLIENT_ID:-}"
  local client_secret="${GOOGLE_OAUTH_CLIENT_SECRET:-}"
  local resource
  local operation

  if [[ -z "$client_id" && -z "$client_secret" ]]; then
    echo 'Google identity brokering is not configured for this environment.'
    return
  fi
  if [[ -z "$client_id" || -z "$client_secret" ]]; then
    echo 'Google identity brokering requires both GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET.' >&2
    exit 1
  fi

  if "$kcadm" get identity-provider/instances/google -r "$realm" >/dev/null 2>&1; then
    operation='update'
    resource='identity-provider/instances/google'
  else
    operation='create'
    resource='identity-provider/instances'
  fi

  "$kcadm" "$operation" "$resource" -r "$realm" \
    -s alias=google \
    -s 'displayName=Continue with Google' \
    -s providerId=google \
    -s enabled=true \
    -s linkOnly=false \
    -s trustEmail=true \
    -s storeToken=false \
    -s addReadTokenRoleOnCreate=false \
    -s 'firstBrokerLoginFlowAlias=first broker login' \
    -s 'config.syncMode=IMPORT' \
    -s 'config.defaultScope=openid profile email' \
    -s 'config.useJwksUrl=true' \
    -s 'config.guiOrder=1' \
    -s "config.clientId=$client_id" \
    -s "config.clientSecret=$client_secret" \
    >/dev/null

  echo 'Google identity brokering was reconciled.'
}

reconcile_passkeys() {
  local rp_id
  rp_id="${KEYCLOAK_PUBLIC_URL#*://}"
  rp_id="${rp_id%%/*}"
  rp_id="${rp_id%%:*}"

  "$kcadm" update "realms/$realm" \
    -s 'webAuthnPolicyPasswordlessRpEntityName=Smart Business' \
    -s "webAuthnPolicyPasswordlessRpId=$rp_id" \
    -s 'webAuthnPolicyPasswordlessSignatureAlgorithms=["ES256","RS256"]' \
    -s 'webAuthnPolicyPasswordlessAttestationConveyancePreference=none' \
    -s 'webAuthnPolicyPasswordlessRequireResidentKey=false' \
    -s 'webAuthnPolicyPasswordlessResidentKey=required' \
    -s 'webAuthnPolicyPasswordlessUserVerificationRequirement=required' \
    -s webAuthnPolicyPasswordlessCreateTimeout=0 \
    -s webAuthnPolicyPasswordlessAvoidSameAuthenticatorRegister=true \
    -s 'webAuthnPolicyPasswordlessAcceptableAaguids=[]' \
    -s 'webAuthnPolicyPasswordlessExtraOrigins=[]' \
    >/dev/null

  "$kcadm" update authentication/required-actions/webauthn-register-passwordless -r "$realm" \
    -s enabled=true \
    -s defaultAction=false \
    >/dev/null

  if ! "$kcadm" get authentication/flows -r "$realm" --fields alias --format csv --noquotes \
    | grep -Fxq "$passkey_browser_flow"; then
    "$kcadm" create authentication/flows/browser/copy -r "$realm" \
      -s "newName=$passkey_browser_flow" >/dev/null
  fi
  "$kcadm" update "realms/$realm" -s "browserFlow=$passkey_browser_flow" >/dev/null
}

reconcile_security_events() {
  "$kcadm" update events/config -r "$realm" \
    -s eventsEnabled=true \
    -s eventsExpiration=172800 \
    -s 'enabledEventTypes=["CLIENT_LOGIN_ERROR","CODE_TO_TOKEN_ERROR","EXECUTE_ACTIONS_ERROR","FEDERATED_IDENTITY_LINK_ERROR","IDENTITY_PROVIDER_FIRST_LOGIN_ERROR","IDENTITY_PROVIDER_POST_LOGIN_ERROR","LOGIN_ERROR","LOGOUT_ERROR","REMOVE_CREDENTIAL_ERROR","REMOVE_FEDERATED_IDENTITY_ERROR","UPDATE_CREDENTIAL_ERROR"]' \
    -s 'eventsListeners=[]' \
    -s adminEventsEnabled=true \
    -s adminEventsDetailsEnabled=false \
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
grant_default_client_scope portal-bff roles
grant_default_client_scope admin-bff roles
grant_realm_role_to_client_scope roles platform_admin
grant_realm_role_to_client_scope roles support_agent
include_realm_roles_in_id_tokens

reconcile_google_identity_provider
reconcile_passkeys
reconcile_security_events

echo "Keycloak realm reconciliation completed for profile $KEYCLOAK_CONFIGURATION_PROFILE."

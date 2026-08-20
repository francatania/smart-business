# Identity and Access Operations

This runbook covers the supported operation of the Smart Business Keycloak realm and the Portal and Administration BFF clients. It deliberately stays independent of a hosting provider.

## Configuration ownership

Identity configuration has three inputs:

1. `infra/keycloak/configuration.json` is the reviewed, non-secret declaration of the realm fields Smart Business owns.
2. The selected environment file supplies public origins and identifies secret names.
3. The deployment secret manager supplies administrative, BFF, database, and Google credentials.

`infra/keycloak/reconcile-realm.sh` applies those inputs. Manual Admin Console changes to owned realm fields, clients, roles, passkey policy, providers, or event policy are unsupported: the next reconciliation may replace them. Users, credentials, passkeys, federated links, and live sessions are runtime data and are never created or deleted by the reconciler.

Use this promotion sequence:

1. Change the canonical configuration and environment contract in a pull request.
2. Run `make keycloak-config-check` and `make keycloak-integration-test`.
3. Inject the reviewed environment values and secrets through the deployment platform.
4. Run the one-shot reconciler from the private operational network.
5. Run the live drift check and then sign in to each affected surface.

For local development:

```bash
make keycloak-config-check
make keycloak-reconcile
make keycloak-drift-check
```

For a shared environment, point the same check at a complete protected environment file and a private Keycloak endpoint. Do not put secret values on the command line or in CI output:

```bash
COMPOSE_ENV_FILE=/protected/runtime/identity.env \
KEYCLOAK_ASSERT_URL=https://private-keycloak.example.invalid \
make keycloak-drift-check
```

The check reads the expected secret values but never prints them. A mismatch must be resolved by correcting the reviewed configuration or re-running reconciliation, not by editing both sides until the check passes.

## Local login setup

Install the pinned toolchains, start the complete stack, and wait for every service to become healthy:

```bash
make setup
make app-up
docker compose --env-file infra/.env -f infra/compose.yaml --profile applications ps
```

The bootstrap administrator in the ignored `infra/.env` administers Keycloak; it is not an application user. To create disposable local application identities:

1. Open `http://auth.localhost:8081/admin/master/console/` and sign in with `KEYCLOAK_ADMIN_USER` and `KEYCLOAK_ADMIN_PASSWORD` from the ignored local file.
2. Select the `smart-business` realm and create a user with a development-only username.
3. Add a non-temporary development-only password under **Credentials**.
4. Leave realm roles empty for a Portal customer. For an Administration smoke test, assign `platform_admin`. That role does not grant organization access.
5. Open Portal at `http://portal.localhost:5173` or Administration at `http://admin.localhost:5174` and use the visible **Sign in** action.

Never create these users in a shared environment. Deterministic test identities belong only to `infra/keycloak/environments/test.env.example`; their provisioning service refuses `local` and `deployed` profiles.

## BFF client-secret rotation

Portal and Administration are independent confidential clients. Rotate one at a time. The supported Keycloak client-secret rotation feature is still marked Preview, so Smart Business does not enable it or depend on concurrent BFF secrets.

1. Schedule a short new-login maintenance window and retain a recoverable reference to the current secret-manager version.
2. Generate a replacement secret in the secret manager.
3. Update the selected BFF secret, reconcile Keycloak, and restart every backend replica with the same secret as one coordinated operation.
4. Run `make keycloak-drift-check` from the private network.
5. Complete a new browser login and logout on the matching surface; confirm an existing JDBC-backed application session remains usable.
6. Retire the previous secret-manager version only after the smoke test succeeds.

During the interval in which Keycloak and a backend replica disagree, new code exchanges and token refreshes can fail. Existing application sessions remain server-side, but a stale replica must not remain in service. Roll back by restoring the previous secret to both Keycloak and every backend replica, then repeat the drift and browser checks.

## Redirect and hostname changes

Callbacks and post-logout destinations remain exact; wildcards are forbidden. For a Portal or Administration origin change:

1. Prepare DNS, TLS, proxy routing, and the application at the new origin.
2. Update the application origin, callback, post-logout URI, and backend registration in one reviewed change.
3. Apply the Keycloak and backend configuration during a coordinated cutover.
4. Verify discovery, drift, login, callback, CSRF-protected logout, and the final relative application route.
5. Roll back all affected values together if the smoke test fails.

Changing `KEYCLOAK_PUBLIC_URL` is not an ordinary callback change. It changes the OIDC issuer and passkey relying-party ID, while Smart Business maps identities by `issuer + subject`. It requires a separate migration plan covering identity mapping and existing passkeys.

## Google identity provider

Google uses a Web application OAuth client whose only required scopes are `openid`, `profile`, and `email`. Store the client secret in the environment's secret manager. Do not put it in a frontend variable, tracked file, ticket, chat, or command-line argument.

The broker callback is:

```text
<KEYCLOAK_PUBLIC_URL>/realms/smart-business/broker/google/endpoint
```

Google permits two enabled client secrets during rotation. Use that overlap:

1. Add a second Google OAuth client secret and store it immediately.
2. Update `GOOGLE_OAUTH_CLIENT_SECRET`, reconcile Keycloak, and run `make keycloak-google-check`.
3. Complete a real browser sign-in from a context without existing Portal or Keycloak cookies.
4. Observe the Google event-error rate and then disable the old secret.
5. Delete the old secret after the monitoring window; re-enable it and restore the previous Keycloak value if the broker fails.

Google console changes may take time to propagate. Its testing-user allowlist is a provider setting, not Smart Business authorization.

## Passkeys and account recovery

Passkeys require the exact Keycloak hostname, a trustworthy origin, a compatible browser/authenticator, and device user verification such as a screen lock, PIN, or biometric action. Deployed environments require HTTPS; local validation uses `auth.localhost`.

After an initial verified login, use the **Account security** link to open Keycloak Account Console. A user can register and label a passkey, test it in a new browser session, and revoke it from the same console. Revoking a passkey does not terminate existing application sessions or remove Google access.

Before revoking an authenticator, retain Google access or another tested passkey. The MVP has no automated recovery when Google and every passkey are lost. Operators must not reset, merge, or relink an identity using only a name, email address, or support conversation. Account recovery remains a separate auditable feature.

Record manual release results in [Passkey Browser Matrix](./passkey-browser-matrix.md). Private browsing is not guaranteed, embedded social-media browsers are unsupported, and users should move to the system browser or installed PWA. Sessions are not transferred between browser contexts.

## Keycloak database backup and restore

The Keycloak PostgreSQL database contains realm runtime state, users, federated links, credentials, passkeys, security events, and provider/client credentials. The canonical configuration can rebuild owned settings, but it cannot recover user data. A realm export is not a database backup.

The platform owner must provide:

- encrypted recurring backups and encrypted transport;
- a backup immediately before a Keycloak or database upgrade;
- retention, access control, and deletion aligned with the environment's data policy;
- a restore drill after material identity changes and before production release;
- the matching Keycloak configuration, image version, database role, and external secret-manager versions.

Recovery procedure:

1. Declare the incident and prevent writes by stopping all Keycloak nodes.
2. Preserve the failed database and select a verified backup compatible with the target PostgreSQL and Keycloak versions.
3. Restore into an empty database owned by the Keycloak database role, using `pg_restore --exit-on-error` for custom-format `pg_dump` archives.
4. Start one Keycloak node and inspect readiness and database migration output.
5. Run the live drift check before and after reconciliation; validate users, roles, clients, Google configuration, and passkey policy.
6. Complete Portal and Administration logins before returning traffic.
7. Require reauthentication when provider-side or application-session continuity cannot be proven.

Backups contain sensitive identity data and secrets. Never attach one to a GitHub issue, CI artifact, or ordinary application log. `make keycloak-integration-test` exercises the same dump, empty-database restore, pre-reconciliation assertion, and cleanup against an isolated disposable database.

## Monitoring

Keycloak health and metrics use management port `9000`. It must be scraped from an authorized operational network and must never be routed through the public authentication hostname.

| Concern          | Signals                                                                                                    | Initial response                                                                |
| ---------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Availability     | `/health/ready`, scraper `up`, HTTP 5xx rate and latency                                                   | Check Keycloak, PostgreSQL connectivity, proxy routing, and certificates        |
| Login failures   | `keycloak_user_events_total{realm="smart-business",event="login",error!=""}`                               | Group by safe error code and client; do not log usernames                       |
| Google health    | Identity-provider event errors with `idp="google"`, upstream status, manual smoke                          | Confirm Google client state, callback, secret version, and provider status      |
| Sessions         | Login/logout/refresh/session-deletion event rates, backend 401 rate, aggregate Spring Session expiry/count | Check clock, configured lifetimes, cleanup, JDBC health, and secret consistency |
| Capacity         | Keycloak HTTP/JVM/database-pool metrics and backend actuator metrics                                       | Check sustained changes before resizing pools or replicas                       |
| Security changes | Restricted Keycloak user-error and administrative event views                                              | Correlate by time, client, safe error code, and approved change record          |

Event metrics contain only `realm`, `clientId`, `idp`, `event`, and `error` dimensions. Stored user error events expire after 48 hours. Administrative events omit request representations, and the logging event listener stays disabled because it can emit identifiers and request details.

Logs and published artifacts may contain correlation IDs, routes, status codes, durations, safe exception types, and stable error codes. They must not contain query strings, authorization codes, tokens, cookies, client secrets, raw subjects, emails, usernames, request bodies, passkey data, or database backups.

Thresholds and paging destinations depend on observed traffic and the chosen monitoring platform. Define them before a shared environment accepts users; do not copy example thresholds without a baseline.

## Troubleshooting

| Symptom                          | Check                                                                                                                                |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `redirect_uri_mismatch`          | Compare the browser callback with the exact BFF callback and the Google broker callback; never add a wildcard                        |
| Callback returns 401/403         | Inspect the safe OIDC error code and correlation ID; verify client ID/secret agreement and CSRF only for unsafe application requests |
| Cookie missing                   | Use the exact Portal/Admin hostname; deployed cookies require HTTPS and are host-only with `Path=/` and `SameSite=Lax`               |
| CSRF 403                         | Fetch `/api/auth/csrf` in the same session, keep it only in memory, and send the returned header on the unsafe request               |
| Issuer mismatch                  | Compare discovery's `issuer` byte-for-byte with `OIDC_ISSUER_URI`; internal token/JWK overrides are local/test only                  |
| Proxy-generated 403 or wrong URL | Configure exactly one trusted forwarded-header mode, overwrite client-supplied forwarded headers, and preserve public host/protocol  |
| Google button missing            | Supply both Google values and reconcile; supplying only one fails validation                                                         |
| Google callback fails            | Check the exact broker URI, secret version, Google client state, consent/test-user state, and provider event errors                  |
| Passkey unavailable              | Confirm HTTPS or `auth.localhost`, RP ID, screen lock, supported browser, and system-browser context                                 |
| Embedded browser loops           | Open the same public route in the system browser and authenticate again; do not transfer cookies between contexts                    |
| Stale session                    | Try CSRF-protected logout, close other Keycloak contexts, and sign in again; do not delete session tables during ordinary support    |

For reverse proxies, use Keycloak's supported `forwarded` or `xforwarded` mode only when TLS terminates before Keycloak, restrict trusted proxy addresses, and overwrite forwarded headers. Do not accept proxy headers with TLS passthrough.

## Clean-environment verification

Before closing an identity operations change, run from a clean checkout or equivalent archive:

```bash
make keycloak-config-check
make keycloak-integration-test
make identity-e2e
make verify-clean-checkout
```

Record the commit SHA, date, operating system, Docker, Node, Chromium, Keycloak, and PostgreSQL versions, commands, and pass/fail result in the implementation issue. Link CI rather than pasting raw service logs. Record Google and passkey smoke results separately because they require real provider credentials and physical browser authenticators. Never include environment contents, cookies, usernames, tokens, secrets, or screenshots of credential forms.

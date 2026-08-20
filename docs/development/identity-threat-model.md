# Identity and Access Threat Model

This model covers the Portal and Administration BFF authentication boundary, the `smart-business` Keycloak realm, Google brokering, passkeys, PostgreSQL persistence, and operational reconciliation. Organization authorization remains owned by backend application data and is outside Keycloak.

## Assets and trust boundaries

Protected assets are Keycloak identities and credentials, Google federated links, passkeys, BFF client/provider secrets, server-side OIDC tokens, application and provider sessions, platform identity mappings, realm administration, and database backups.

```text
Browser ──HTTPS──> Portal/Admin proxy ──private HTTP──> Spring BFF
   │                                                │
   └──────────────HTTPS redirects───────────────────┼──> Keycloak
                                                    │       │
                                                    │       ├──HTTPS──> Google
                                                    │       └──private SQL──> Keycloak database
                                                    └──private SQL──> application/session database

Operator/CI ──private admin channel + secret manager──> reconciler/Keycloak
Monitoring ──private management network───────────────> health and aggregate metrics
```

Each arrow is a trust boundary. Public clients cannot reach the database, management port, secret manager, or Keycloak administration channel. The browser receives only an opaque HTTP-only application cookie; OIDC tokens remain in the backend session.

## Threats and controls

| Threat                                        | Controls                                                                                                                                 | Residual risk / response                                                                                            |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Authorization-code or token theft             | Authorization Code with S256 PKCE, confidential clients, exact callbacks, TLS, server-side tokens, no browser storage                    | Compromised backend/session store requires secret rotation, session invalidation, and incident response             |
| Open redirect or hostile logout destination   | Allowlisted relative return paths and exact server-owned callbacks/post-logout URIs                                                      | New routes require deliberate allowlist and E2E updates                                                             |
| CSRF                                          | Same-origin BFF, `SameSite=Lax`, session-backed token and required header on unsafe requests                                             | A compromised same-origin script remains in the trusted application boundary                                        |
| Session fixation or theft                     | Session ID rotation after login, host-only `HttpOnly` cookies, secure deployed cookie, idle/absolute expiry, JDBC invalidation           | Stolen cookies remain useful until expiry or invalidation; protect browsers and TLS endpoints                       |
| Cross-surface session confusion               | Separate Portal/Admin clients, origins, callbacks, registrations, and cookies                                                            | A platform identity may legitimately authenticate to both surfaces; authorization still denies absent capabilities  |
| Organization data access from identity claims | Backend resolves memberships/capabilities; Keycloak exposes only stable global roles                                                     | Incorrect backend authorization is handled in owning business modules, not by adding organization roles to Keycloak |
| Account merge or takeover                     | Platform identity key is exact `issuer + subject`; no automatic linking by email/name                                                    | No automated recovery after all authenticators are lost; support cannot override this boundary                      |
| Passkey downgrade or biometric collection     | Discoverable credentials, required user verification, no enterprise attestation; only public-key material reaches Keycloak               | Browser/authenticator compatibility and device compromise remain external risks                                     |
| Provider compromise or outage                 | Minimal Google scopes, no stored Google tokens, provider metrics, separate secret, passkey alternative                                   | First login can fail while Google is unavailable; existing application sessions may continue until reauthentication |
| Realm drift or unsafe manual change           | Canonical configuration, idempotent reconciler, static/live checks, exact grants and URLs                                                | Runtime data is intentionally outside reconciliation and requires database backup                                   |
| Administrative credential compromise          | Private admin path, secret manager, distinct credentials, administrative events without payloads                                         | Rotate credentials, review events, reconcile, and assess database/user changes                                      |
| Proxy-header or issuer spoofing               | Fixed public hostname/issuer, exact forwarded-header mode, trusted proxy addresses, public HTTPS                                         | Misconfigured infrastructure can still produce redirects or audit IPs with attacker-controlled values               |
| Database loss or malicious restore            | Encrypted backups, restricted access, pre-upgrade copy, isolated restore test, version compatibility and post-restore drift/login checks | Recovery may invalidate live provider/application sessions and require reauthentication                             |
| Sensitive telemetry or CI artifacts           | Allowlisted log fields, aggregate metric labels, no event logging listener, artifact scanning, disabled Playwright media/traces          | Restricted Keycloak event storage and backups still contain identity data and need their own access controls        |

## Operational assumptions

- Shared environments use HTTPS and isolate Keycloak administration and management endpoints from public traffic.
- The deployment platform injects secrets without committing or printing them.
- PostgreSQL and Keycloak versions remain within their supported compatibility ranges, and backups are tested before upgrades.
- Operators can stop Keycloak writes during destructive restore or issuer migration work.
- Browser extensions, compromised endpoints, Google availability, and hardware authenticator security are outside Smart Business control.
- Automated account recovery, enterprise SSO, organization membership operations, and hosting-provider topology are outside this model's current scope.

Review this model whenever authentication methods, public origins, recovery behavior, session policy, Keycloak roles, organization authorization, or operational topology changes.

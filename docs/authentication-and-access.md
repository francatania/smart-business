# Authentication and Access

## Goals

- Avoid passwords for customers.
- Minimize friction in the first booking.
- Support secure access to private appointments and shared records.
- Keep customer identity separate from organization-specific data access.
- Provide stronger controls for business staff.
- Work as a web application and PWA without depending on an app store.
- Keep OAuth, OpenID Connect, passkey, and recovery implementation outside the business domain.

## Responsibility Boundaries

### Keycloak

Keycloak is the identity provider and authorization server. It is responsible for:

- Authenticating users.
- Brokering Google and future external identity providers.
- Registering and authenticating passkeys through WebAuthn.
- Managing authentication flows, multi-factor methods, and recovery mechanisms.
- Linking external identities to a Keycloak identity.
- Issuing, refreshing, and revoking OIDC tokens.
- Maintaining the identity-provider session.

### Spring Boot

Spring Boot acts as an OIDC confidential client and backend for frontend. It is responsible for:

- Starting and completing the OIDC authorization-code flow.
- Keeping Keycloak tokens on the server side.
- Creating and validating the application session.
- Mapping the Keycloak identity to a Smart Business user.
- Evaluating organization memberships, roles, and domain permissions.
- Protecting endpoints against CSRF and unauthorized access.

### React applications

The portal PWA and administration application are responsible for:

- Redirecting the user through backend authentication endpoints.
- Sending the secure application-session cookie.
- Rendering only capabilities reported by the backend.
- Handling session expiration and reauthentication without managing bearer tokens.

React must not store access or refresh tokens in `localStorage`, IndexedDB, or another persistent browser store.

## Keycloak Topology

The platform uses one realm:

```text
smart-business realm
├── portal-bff
├── admin-bff
└── future service clients
```

A realm or OIDC client must not be created for each customer organization. Platform users can belong to several organizations and can be both customers and professionals.

Keycloak Organizations is not the source of truth for Smart Business organizations or organization memberships in the initial architecture. It may be evaluated later for enterprise identity scenarios.

## Browser Authentication Flow

The applications use the backend-for-frontend pattern:

```text
Browser                 Spring Boot                         Keycloak
   │                         │                                  │
   │ Start authentication    │                                  │
   ├────────────────────────>│                                  │
   │                         │ Authorization request            │
   │                         ├─────────────────────────────────>│
   │                         │                                  │ Authenticate
   │                         │ Authorization code               │ with Google,
   │                         │<─────────────────────────────────┤ passkey, etc.
   │                         │ Token exchange                   │
   │                         ├─────────────────────────────────>│
   │ Session cookie          │ Tokens remain server-side       │
   │<────────────────────────┤                                  │
```

The browser receives a secure, HTTP-only cookie for the Spring application session. It does not receive or manage Keycloak refresh tokens.

Spring Session JDBC stores application sessions so multiple backend replicas can serve the same authenticated user. Application logout invalidates the Spring session and completes the appropriate Keycloak logout flow.

### BFF login endpoints

Portal and Administration start authentication through separate backend entry
points:

| Surface        | Login entry point                                    | OIDC callback                   | Default destination |
| -------------- | ---------------------------------------------------- | ------------------------------- | ------------------- |
| Portal         | `GET /api/auth/login/portal?returnTo=/relative-path` | `/api/auth/callback/portal-bff` | `/book`             |
| Administration | `GET /api/auth/login/admin?returnTo=/relative-path`  | `/api/auth/callback/admin-bff`  | `/calendar`         |

The entry point records the validated destination in the server-side session
and redirects to Spring Security's Authorization Code flow. The callback code,
OIDC state, PKCE verifier, access token, ID token, and refresh token are never
returned to React or stored in browser-managed persistence. Successful
authentication rotates the application-session identifier and redirects only
to the stored relative destination.

Return destinations are an application-owned allowlist rather than arbitrary
browser input. Portal permits `/book`, `/appointments`, and
`/professional/schedule`; Administration permits `/calendar`, `/customers`,
`/configuration`, and `/metrics`. Query strings are allowed on these exact
paths. Absolute URLs, protocol-relative URLs, fragments, control characters,
encoded redirect attempts, and paths belonging to the other surface fall back
to the surface's default destination. This list must be extended deliberately
when a new authenticated top-level route is introduced.

The backend discovers Keycloak from the configured issuer and registers exactly
two confidential clients: `portal-bff` and `admin-bff`. Both require
Authorization Code with S256 PKCE and use `client_secret_basic` for the
server-to-server token exchange. All API routes are authenticated by default;
only system information, public booking resources, authentication protocol
routes, API documentation, and management endpoints are explicitly public.
Unauthenticated API access returns `application/problem+json` rather than an
HTML login redirect.

## Customer Authentication

### First booking

The customer can browse services and availability without signing in. Identity verification happens when confirming the booking.

Initially supported or planned methods:

- Google through Keycloak identity brokering.
- Passkeys after a verified identity exists.

The MVP does not include a Smart Business password, email magic link, email one-time code, SMS code, or messaging-provider code. A user who loses access to Google and every enrolled passkey has no automated recovery path until an auditable recovery design is delivered. This limitation and its security rationale are defined in [ADR 0001](./decisions/0001-identity-session-and-recovery-policy.md).

Google authentication requests only the identity information needed for sign-in. Access to unrelated Google APIs is not required.

### Implicit local account creation

After successful Keycloak authentication:

1. Read the verified OIDC issuer and `sub` claims.
2. Find an external identity by the `issuer + subject` pair.
3. If none exists, create a platform user and external-identity record.
4. Find the customer relationship for the selected organization.
5. If none exists, create it.
6. Confirm the appointment.

The OIDC subject, not the email address, is the stable external identity key. User creation and organization relationship creation are separate operations and concepts.

### Returning access

The portal uses a secure, persistent application session so a customer does not authenticate on every launch. Reauthentication may be required when:

- The Spring application session expires.
- The Keycloak identity-provider session expires or is revoked.
- The customer changes device or browser context.
- The customer performs a sensitive action.
- Security policy detects elevated risk.

## Passkeys and Device Biometrics

Keycloak manages passkey registration and authentication using its WebAuthn passwordless capabilities.

After a verified account exists, the customer may register a passkey for quick future access. The user experience may refer to the familiar device action, such as fingerprint, face recognition, or screen lock.

Smart Business and Keycloak do not receive or store the user's fingerprint or face image. The device verifies the user and Keycloak validates a public-key credential.

Recommended enrollment moment:

1. Complete the first booking with a verified identity.
2. Explain the benefit of faster future access.
3. Offer Keycloak's passkey registration flow.
4. Explain that removing the last usable authenticator can make the account inaccessible in the MVP.

Passkey creation must not be required to complete the first booking.

## Embedded Browser Considerations

The public booking page is expected to be opened from Instagram and similar applications.

- The core booking UI must work as a regular mobile website.
- OIDC authentication must use a full-page redirect.
- If the embedded browser cannot complete the Keycloak or upstream provider flow, the application offers an explicit **Open in browser** path.
- Installation prompts and passkey enrollment happen after booking, preferably in the system browser or installed PWA.
- Moving between an embedded browser, system browser, and installed PWA may require authentication again.
- Smart Business does not transfer an application session between browser contexts.

## Professional and Staff Authentication

Professionals, receptionists, administrators, and owners use the same Keycloak realm as customers. They do not require a separate identity.

Staff access requires:

- A successfully authenticated Keycloak identity.
- A mapped and active Smart Business user.
- An active organization membership in PostgreSQL.
- One or more organization roles or policies in PostgreSQL.
- A valid Spring application session.

Passkeys are appropriate for professional mobile access. Staff authentication is considered recent for 12 hours. Sensitive operations require strong reauthentication completed within the preceding 15 minutes. The Identity and Access epic initially enforces this requirement for `platform_admin`; organization owner and administrator capabilities will adopt it when those capabilities are implemented.

## Roles and Authorization

Authentication establishes identity. Authorization is evaluated by Spring Boot using application data.

### Keycloak roles

Keycloak roles are limited to stable platform-wide privileges, such as:

- `platform_admin`.
- A possible future `support_agent` role.

Keycloak roles must not encode every organization, location, or appointment permission.

### Application roles

Organization roles remain in PostgreSQL:

- Owner.
- Administrator.
- Receptionist.
- Professional.

Authorization considers:

- Active organization.
- Organization membership or customer relationship.
- Role and policy grants.
- Location assignment.
- Professional assignment to an appointment where applicable.
- Record visibility.
- Media purpose and permission state.

A valid Keycloak session, token, or Spring application session alone never grants access to an organization's records.

Organization access changes take effect through application authorization rules and session-security policy. The backend must never trust a role displayed by the frontend without evaluating the protected operation.

## Identity Linking

Keycloak manages links between its user and Google or future external identity providers. Smart Business maps the Keycloak identity using `issuer + subject`.

- External identities are linked only after the relevant verification flow succeeds.
- Accounts must not be merged solely because names or unverified contact fields are similar.
- Conflicting verified identities require an account-recovery or support flow.
- Linking an identity does not merge organization-private records across different Smart Business users without a deliberate, auditable resolution process.
- Changing an email address does not change the local user's external identity key.
- Losing every authenticator does not permit organization staff to recover an identity or move private records to another user.

## Session and Token Principles

- Use secure, HTTP-only, appropriately scoped cookies for Spring application sessions.
- Use independent, host-only Portal and Admin cookies. Keycloak provides SSO between applications without merging their Spring sessions.
- Apply a 30-day inactivity timeout and a 90-day absolute lifetime to both application sessions.
- Treat staff authentication as recent for 12 hours and sensitive strong reauthentication as recent for 15 minutes.
- Keep Keycloak access and refresh tokens on the server side for browser applications.
- Do not use the Keycloak JavaScript adapter as the primary browser authentication architecture.
- Do not store provider or Keycloak tokens in general-purpose browser storage.
- Protect state-changing requests against CSRF.
- Rotate and revoke sessions according to security policy.
- Revoke or limit staff access when an organization membership is disabled.
- Make sign-out available per device and, later, across all devices.
- Coordinate local logout with Keycloak logout.

Future service-to-service calls may use Keycloak-issued access tokens. Those services validate issuer, audience, signature, expiry, and required scopes or roles independently.

## Keycloak Operations

Keycloak is critical infrastructure and requires:

- A pinned and regularly upgraded version.
- A dedicated logical PostgreSQL database and database user.
- Backups and restore testing.
- Health and readiness monitoring.
- Login-failure and security-event monitoring.
- TLS and secure proxy configuration.
- Version-controlled, reproducible realm and client configuration.
- Environment-specific secret management.
- Globally branded Smart Business authentication pages, with English as the default language and Spanish as the supported alternative.
- Email configuration for verification, recovery, and security notifications.
- Idempotent configuration reconciliation that updates existing realms without deleting users.
- Test identities provisioned only by explicit CI or test setup, never by deployable profiles.

Local development may use the same PostgreSQL server for Smart Business and Keycloak, but they use separate logical databases and credentials.

## Decisions

1. Customers do not create a password during booking.
2. Identity verification occurs when confirming a booking, not while browsing availability.
3. Keycloak is the identity provider and authorization server.
4. The platform uses one `smart-business` realm rather than one realm per organization.
5. Google identity brokering and passkeys are managed by Keycloak.
6. Spring Boot acts as the OIDC client and backend for frontend.
7. Browser applications use a secure Spring session cookie and do not manage bearer tokens.
8. The first verified booking creates or finds the platform user and organization customer relationship.
9. The Keycloak `issuer + subject` pair maps to the Smart Business user.
10. Keycloak contains only stable platform-wide roles; organization roles and permissions remain in PostgreSQL.
11. The application never receives or stores fingerprint or face biometric data.
12. Staff authentication and authorization are stricter than customer booking access.
13. Portal and Admin use isolated host-only application sessions; Keycloak provides cross-application SSO.
14. Both application sessions expire after 30 days of inactivity or 90 days absolutely.
15. Staff authentication is fresh for 12 hours; sensitive strong reauthentication is fresh for 15 minutes.
16. Google is the primary MVP identity and passkeys are optional after verification; other verification channels are deferred.
17. The MVP has no automatic recovery after all authenticators are lost, and identity is never recovered or merged from contact-field matches.
18. Return targets are limited to validated same-application relative paths or configured safe destinations.
19. Keycloak configuration is version-controlled and reconciled idempotently, while secrets remain environment-specific.
20. Keycloak uses global Smart Business branding, English by default, and Spanish as an alternative.

The detailed policy, rationale, local and deployed cookie defaults, and follow-up work are recorded in [ADR 0001: Identity, Session, and Recovery Policy](./decisions/0001-identity-session-and-recovery-policy.md).

## Reference Documentation

- [Keycloak Server Administration Guide](https://www.keycloak.org/docs/latest/server_admin/)
- [Keycloak JavaScript adapter security guidance](https://www.keycloak.org/securing-apps/javascript-adapter)
- [Spring Security OAuth 2.0 and OpenID Connect](https://docs.spring.io/spring-security/reference/servlet/oauth2/)

## Deferred Decisions

- Which additional verified identity method, if any, follows Google and passkeys after the MVP.
- The auditable recovery mechanism for a user who loses all authenticators, tracked in [#62](https://github.com/francatania/smart-business/issues/62).
- Whether a future risk model changes the authentication-freshness windows or requires mandatory passkey enrollment for specific capabilities.

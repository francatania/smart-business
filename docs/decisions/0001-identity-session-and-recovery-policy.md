# ADR 0001: Identity, Session, and Recovery Policy

- Status: Accepted
- Date: 2026-08-04
- Scope: Portal and administration browser applications

## Context

Smart Business needs low-friction customer authentication and stronger controls for staff without exposing OAuth tokens to either React application. The public booking flow is commonly opened from an embedded browser, while returning customers and professionals need persistent access from a browser or installed PWA.

Portal and administration traffic use separate backend-for-frontend OIDC clients. Keycloak owns identity-provider authentication and single sign-on; Spring Boot owns each application session and all domain authorization. The initial policy must therefore define session isolation, authentication freshness, account recovery, redirects, and Keycloak configuration before authentication behavior is implemented.

## Decision

### Authentication methods

- Google identity brokering is the primary MVP sign-in method.
- A passkey is an optional authenticator that can be enrolled only after a verified identity exists.
- The MVP does not provide a Smart Business password, email magic link, email one-time code, SMS code, or messaging-provider code.
- Keycloak must establish the authentication assurance level. The browser applications must not infer assurance from UI state or local storage.

### Session isolation and lifetime

- Portal and Admin have independent, host-only Spring application-session cookies. A cookie must never use a shared parent-domain `Domain` attribute.
- Keycloak single sign-on may let a user enter the second application without repeating the upstream Google authentication, but it does not merge the two Spring sessions.
- Both applications use a 30-day inactivity timeout and a 90-day absolute lifetime.
- Activity may extend the inactivity deadline, but never the absolute deadline.
- Authentication rotates the application-session identifier. Sensitive reauthentication rotates it again.
- Local and test environments use `SBSESSION`. Deployed environments use the `__Host-SBSESSION` prefix with `Secure`, `HttpOnly`, `SameSite=Lax`, path `/`, and no `Domain` attribute.

### Staff authentication freshness

- A staff-authenticated session is considered recent for 12 hours.
- Sensitive authorization requires strong reauthentication completed within the preceding 15 minutes.
- The Identity and Access epic enforces sensitive reauthentication for the global `platform_admin` role.
- The Organizations and Tenant Access epic will apply the same mechanism to organization owner and administrator capabilities once those memberships and capabilities exist.
- Expiration of an authentication-freshness window does not silently extend it. The backend initiates a controlled Keycloak reauthentication flow.

### Lost-authenticator recovery

- A user who loses access to Google and every enrolled passkey has no automated Smart Business recovery path in the MVP.
- Records must never be linked or merged solely through a matching email address, display name, phone number, or an assertion by organization staff.
- Organization staff cannot recover a platform identity or move private records between platform users.
- The limitation is explicit in user-facing support guidance. An auditable recovery design is tracked in [#62](https://github.com/francatania/smart-business/issues/62).

This deferral can temporarily make an account inaccessible. It is safer than introducing an unverifiable recovery path that could disclose appointments, customer records, or organization-private media.

### Return targets and embedded browsers

- Login, reauthentication, and logout accept only configured application destinations or relative paths belonging to the initiating application.
- A relative return target must start with exactly one `/` and must not contain a scheme, authority, backslash, control character, or an encoded form that becomes one of those values after decoding.
- Invalid, absent, or cross-application targets use that application's configured safe default. The browser cannot supply an arbitrary post-logout URI.
- OIDC uses full-page navigation, including when booking started inside an embedded browser.
- When an embedded browser cannot complete the provider flow, the UI explains the limitation and offers an explicit **Open in browser** action. Smart Business does not attempt to transfer an application session between browser contexts.
- Passkey enrollment and PWA installation are offered in the system browser or installed PWA, not required inside an embedded browser.

### Keycloak configuration promotion

- Non-secret realm, client, role, flow, localization, and theme settings are version-controlled.
- Environment-specific client credentials and identity-provider secrets are supplied through environment secret configuration and are never committed.
- A repeatable, idempotent reconciliation process updates existing realms without deleting users. Issue [#49](https://github.com/francatania/smart-business/issues/49) implements that process.
- Test users and test credentials are provisioned only by explicit CI or test setup and are never imported by a deployable profile.

### Branding and localization

- Keycloak-hosted pages use global Smart Business branding in the MVP; per-organization identity themes are deferred.
- English is the default language and Spanish is the supported alternative.
- Authentication and recovery messages must not reveal whether an account or external identity exists.

## Consequences

- The two applications can evolve independently and cannot read each other's application cookies.
- Long-lived customer convenience is bounded by an absolute expiration, while staff-sensitive actions require recent proof of identity.
- Server-side session state is required to retain OIDC tokens, inactivity state, absolute expiry, and authentication assurance.
- Users can be locked out when every authenticator is lost until the auditable recovery capability is designed and delivered.
- Email remains a contact attribute, not an identity key or implicit account-linking mechanism.
- Local environments cannot fully reproduce deployed `Secure` cookie behavior without HTTPS, so automated tests must cover both profiles.

## Follow-up Work

- [#49](https://github.com/francatania/smart-business/issues/49): reconcile Keycloak configuration idempotently.
- [#52](https://github.com/francatania/smart-business/issues/52): enforce cookie, CSRF, lifetime, rotation, and authentication-freshness rules.
- [#55](https://github.com/francatania/smart-business/issues/55): configure and validate Google identity brokering.
- [#56](https://github.com/francatania/smart-business/issues/56): implement optional passkey enrollment and revocation.
- [#62](https://github.com/francatania/smart-business/issues/62): design auditable recovery after all authenticators are lost.
- [#5](https://github.com/francatania/smart-business/issues/5): apply organization roles and capability-based sensitive reauthentication.

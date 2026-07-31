# Authentication and Access

## Goals

- Avoid passwords for customers.
- Minimize friction in the first booking.
- Support secure access to private appointments and shared records.
- Keep customer identity separate from organization-specific data access.
- Provide stronger controls for business staff.
- Work as a web application and PWA without depending on an app store.

## Customer Authentication

### First booking

The customer can browse without signing in. Identity verification happens when confirming the first booking.

Initially supported or planned methods:

- Sign in with Google.
- Email magic link or one-time code.
- Verified phone or messaging-channel code as a possible later option.

Google authentication should request only the identity information needed for sign-in. Access to unrelated Google APIs is not required.

### Implicit account creation

After successful verification:

1. Find a user linked to the verified external identity.
2. If none exists, create a platform user.
3. Find the customer relationship for the selected organization.
4. If none exists, create it.
5. Confirm the appointment.

User creation and organization relationship creation are separate operations and concepts.

### Returning access

The PWA uses a secure, persistent session so a customer does not authenticate on every launch. Reauthentication may be required when:

- The session expires.
- The customer changes device or browser context.
- The customer performs a sensitive action.
- Security policy detects elevated risk.

## Passkeys and Device Biometrics

After a verified account exists, the customer may register a passkey for quick future access.

The user experience may refer to the familiar device action, such as fingerprint, face recognition, or screen lock. The application does not receive or store biometric data. The device verifies the user and the server validates a public-key credential.

Recommended enrollment moment:

1. Complete the first booking.
2. Explain the benefit of faster future access.
3. Ask the customer whether they want to create a passkey.
4. Keep Google or verified contact methods as recovery and alternative access options.

Passkey creation must not be required to complete the first booking.

## Embedded Browser Considerations

The public booking page is expected to be opened from Instagram and similar applications.

- The core booking UI must work as a regular mobile website.
- Authentication must support a full-page redirect or a non-provider fallback.
- If the embedded browser cannot complete an identity-provider flow, the application should offer an explicit **Open in browser** path.
- Installation prompts and passkey enrollment should happen after booking, preferably in the system browser or installed PWA.
- Moving between an embedded browser, system browser, and installed PWA may require the user to authenticate again.

## Professional and Staff Authentication

Professionals, receptionists, administrators, and owners must use authenticated staff accounts.

Staff access requires:

- A verified platform identity.
- An active organization membership.
- One or more assigned roles or policies.
- A valid session.

Passkeys are appropriate for professional mobile access. Owners and administrators may require stronger reauthentication or multi-factor controls for sensitive settings.

## Authorization

Authentication establishes the user's identity. Authorization is evaluated separately using:

- Active organization.
- Organization membership or customer relationship.
- Role and policy grants.
- Location assignment.
- Professional assignment to an appointment where applicable.
- Record visibility.
- Media purpose and permission state.

A valid platform session alone never grants access to every organization that has a relationship with the user.

## Identity Linking

A person may initially book with one method and later use another, for example email first and Google later.

- External identities are linked only after both sides are appropriately verified.
- Accounts must not be merged solely because names or unverified contact fields are similar.
- Conflicting verified identities require an account-recovery or support flow.
- Linking an identity does not merge organization-private records across different users without a deliberate, auditable resolution process.

## Session Principles

- Use secure, HTTP-only cookies for browser sessions where supported by the architecture.
- Do not store provider access tokens in general-purpose browser storage.
- Rotate and revoke sessions according to security policy.
- Revoke or limit staff sessions when an organization membership is disabled.
- Make sign-out available per device and, later, across all devices.

## Decisions

1. Customers do not create a password during booking.
2. Identity verification occurs when confirming a booking, not while browsing availability.
3. The first verified booking creates or finds the platform user and organization customer relationship.
4. Sign in with Google is an option, not the only customer authentication method.
5. Passkeys provide optional fast access after account verification.
6. The application never receives or stores fingerprint or face biometric data.
7. Staff authentication and authorization are stricter than customer booking access.

## Open Questions

- Which non-Google verification channel launches first: email, SMS, or a messaging provider.
- Session duration for customer and staff accounts.
- Whether staff must enroll a passkey or another second factor.
- Account recovery requirements when all authenticators are lost.
- Whether one user can switch directly between customer and professional experiences in the same PWA.

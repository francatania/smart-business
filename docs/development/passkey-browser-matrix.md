# Passkey Browser Matrix

Passkeys are managed by Keycloak and require a device with a screen lock, PIN, or biometric user verification. Record a manual result for each supported browser before a production release.

| Scenario                                       | Chromium / Chrome | Firefox        | Safari         |
| ---------------------------------------------- | ----------------- | -------------- | -------------- |
| Register a passkey in the system browser       | Pending           | Pending        | Pending        |
| Authenticate with the registered passkey       | Pending           | Pending        | Pending        |
| Revoke the passkey in Keycloak Account Console | Pending           | Pending        | Pending        |
| Continue with Google after revocation          | Pending           | Pending        | Pending        |
| Private browsing                               | Not guaranteed    | Not guaranteed | Not guaranteed |
| Embedded social-media browser                  | Not supported     | Not supported  | Not supported  |

Use `auth.localhost` for local validation. Deployed validation requires the final HTTPS Keycloak hostname. Record browser version, operating system, authenticator type, and observed limitation with each result.

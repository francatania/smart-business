# Portal PWA

The portal is the installable, role-aware customer and professional application.

## Routes

- `/book`: public booking entry point.
- `/appointments`: customer appointment area.
- `/professional/schedule`: professional schedule area.

`/book` remains public. `/appointments` waits for a confirmed BFF session, and
`/professional/schedule` also requires at least one server-reported
`organizationAccess` entry. Until Organizations exposes more specific professional
capabilities, an authenticated user with no such entry sees a no-organization-access
state instead of professional content.

The Portal sends authentication through the same-origin BFF and never stores OIDC
tokens in browser storage. It preserves the requested Portal route through the BFF's
safe return-path policy, gives embedded-browser users an explicit option to open the
current page elsewhere, and explains that sessions cannot be transferred between
browser contexts. Verified users may optionally manage passkeys in Keycloak Account
security; passkey enrollment is never required.

The current screens establish navigation, forms, API connectivity, offline static-shell behavior, and role-oriented route boundaries. Domain workflows are implemented by later epics.

Run `pnpm --filter @smart-business/portal dev` from the repository root. The development server proxies `/api` to `http://localhost:8080`.

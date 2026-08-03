# Portal PWA

The portal is the installable, role-aware customer and professional application.

## Routes

- `/book`: public booking entry point.
- `/appointments`: customer appointment area.
- `/professional/schedule`: professional schedule area.

The current screens establish navigation, forms, API connectivity, offline static-shell behavior, and role-oriented route boundaries. Authentication and domain workflows are implemented by later epics.

Run `pnpm --filter @smart-business/portal dev` from the repository root. The development server proxies `/api` to `http://localhost:8080`.

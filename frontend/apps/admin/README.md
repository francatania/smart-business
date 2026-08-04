# Administration Application

The administration web application is the desktop-oriented workspace for business owners and managers.

## Routes

- `/calendar`: operational calendar.
- `/customers`: business-owned customer directory.
- `/configuration`: business settings.
- `/metrics`: business performance summary.

The screens establish navigation, forms, shared UI usage, and API connectivity. Authentication, organization configuration, scheduling, customer records, and analytics behavior belong to later epics.

Run `pnpm --filter @smart-business/admin dev` from the repository root. The development server proxies `/api` to `http://localhost:8080`.

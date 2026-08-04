# End-to-End Tests

Playwright verifies the containerized portal, administration application, API proxy, and portal offline shell in Chromium.

Start the complete application profile and run the suite from the repository root:

```bash
make compose-up
pnpm --filter @smart-business/e2e exec playwright install chromium
pnpm e2e
```

`PORTAL_BASE_URL` and `ADMIN_BASE_URL` can target another disposable environment. Tests create no business data and depend only on the platform-foundation placeholders.

import { expect, test } from '@playwright/test';

const portalBaseUrl = process.env.PORTAL_BASE_URL ?? 'http://127.0.0.1:5173';
const adminBaseUrl = process.env.ADMIN_BASE_URL ?? 'http://127.0.0.1:5174';

const authenticatedSession = {
  actor: {
    absoluteExpiresAt: '2026-08-16T18:00:00Z',
    assuranceLevel: 'standard',
    authenticatedAt: '2026-08-13T10:00:00Z',
    displayName: 'Portal user',
    globalRoles: [],
    id: '0e18c9e2-1ef4-4e67-8e4c-7b8c6a44713e',
    organizationAccess: [],
    status: 'ACTIVE',
  },
  authenticated: true,
};

const administrationSession = {
  ...authenticatedSession,
  actor: {
    ...authenticatedSession.actor,
    displayName: 'Administration user',
    organizationAccess: [
      { capabilities: [], organizationId: '8e3df83b-93a0-43b9-b2cf-8fe4e570dfe7' },
    ],
  },
};

test('portal loads a deep route and reaches the API through its proxy', async ({ page }) => {
  await page.goto(`${portalBaseUrl}/book`);

  await expect(page.getByRole('heading', { name: 'Book your next service' })).toBeVisible();
  await expect(page.locator('footer')).toContainText('smart-business');
});

test('portal keeps private customer content hidden for an anonymous session', async ({ page }) => {
  await page.route('**/api/auth/session', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ authenticated: false }),
    }),
  );
  await page.goto(`${portalBaseUrl}/appointments`);

  await expect(page.getByRole('heading', { name: 'Sign in to continue' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'My appointments' })).toHaveCount(0);
});

test('portal renders customer content only after an authenticated session response', async ({
  page,
}) => {
  await page.route('**/api/auth/session', (route) =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify(authenticatedSession) }),
  );
  await page.goto(`${portalBaseUrl}/appointments`);

  await expect(page.getByRole('heading', { name: 'My appointments' })).toBeVisible();
});

test('portal shows the expired session state without private content', async ({ page }) => {
  await page.route('**/api/auth/session', (route) => route.fulfill({ status: 401 }));
  await page.goto(`${portalBaseUrl}/appointments`);

  await expect(page.getByRole('heading', { name: 'Your session has ended' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'My appointments' })).toHaveCount(0);
});

test('portal denies the professional route without organization access', async ({ page }) => {
  await page.route('**/api/auth/session', (route) =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify(authenticatedSession) }),
  );
  await page.goto(`${portalBaseUrl}/professional/schedule`);

  await expect(page.getByRole('heading', { name: 'No organization access' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Professional schedule' })).toHaveCount(0);
});

test('administration renders its shell only after an authorized session response', async ({
  page,
}) => {
  await page.route('**/api/auth/session', (route) =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify(administrationSession) }),
  );
  await page.route('**/api/system/info', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ name: 'smart-business', version: 'test' }),
    }),
  );
  await page.goto(`${adminBaseUrl}/metrics`);

  await expect(page.getByRole('heading', { name: 'Metrics', level: 1 })).toBeVisible();
  await expect(page.locator('.app-status')).toContainText('smart-business');
});

test('administration keeps its shell hidden for an anonymous session', async ({ page }) => {
  await page.route('**/api/auth/session', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ authenticated: false }),
    }),
  );
  await page.goto(`${adminBaseUrl}/metrics`);

  await expect(page.getByRole('heading', { name: 'Sign in to continue' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Metrics', level: 1 })).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Administration navigation' })).toHaveCount(0);
});

test('administration denies an authenticated user without organization access', async ({
  page,
}) => {
  await page.route('**/api/auth/session', (route) =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify(authenticatedSession) }),
  );
  await page.goto(`${adminBaseUrl}/metrics`);

  await expect(page.getByRole('heading', { name: 'No organization access' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Metrics', level: 1 })).toHaveCount(0);
});

test('portal keeps its static shell offline while API traffic stays network-only', async ({
  context,
  page,
}) => {
  await page.goto(`${portalBaseUrl}/book`);
  await page.evaluate(async () => navigator.serviceWorker.ready);
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
    .toBe(true);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Book your next service' })).toBeVisible();

  const apiFailedOffline = await page.evaluate(async () => {
    try {
      await fetch('/api/system/info');
      return false;
    } catch {
      return true;
    }
  });
  expect(apiFailedOffline).toBe(true);
});

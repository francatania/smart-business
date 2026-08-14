import { expect, test } from '@playwright/test';

import { AdminPage } from '../pages/admin-page';
import { PortalPage } from '../pages/portal-page';

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
  const portal = new PortalPage(page);
  await portal.openBooking();

  await portal.expectBooking();
  await portal.expectFooterBrand();
});

test('portal keeps private customer content hidden for an anonymous session', async ({ page }) => {
  const portal = new PortalPage(page);
  await page.route('**/api/auth/session', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ authenticated: false }),
    }),
  );
  await portal.openAppointments();

  await portal.expectSignInPrompt();
  await portal.expectAppointmentsHidden();
});

test('portal renders customer content only after an authenticated session response', async ({
  page,
}) => {
  const portal = new PortalPage(page);
  await page.route('**/api/auth/session', (route) =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify(authenticatedSession) }),
  );
  await portal.openAppointments();

  await portal.expectAppointments();
});

test('portal shows the expired session state without private content', async ({ page }) => {
  const portal = new PortalPage(page);
  await page.route('**/api/auth/session', (route) => route.fulfill({ status: 401 }));
  await portal.openAppointments();

  await portal.expectExpiredSession();
  await portal.expectAppointmentsHidden();
});

test('portal denies the professional route without organization access', async ({ page }) => {
  const portal = new PortalPage(page);
  await page.route('**/api/auth/session', (route) =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify(authenticatedSession) }),
  );
  await portal.openProfessionalSchedule();

  await portal.expectNoOrganizationAccess();
  await portal.expectProfessionalScheduleHidden();
});

test('administration renders its shell only after an authorized session response', async ({
  page,
}) => {
  const admin = new AdminPage(page);
  await page.route('**/api/auth/session', (route) =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify(administrationSession) }),
  );
  await page.route('**/api/system/info', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ name: 'smart-business', version: 'test' }),
    }),
  );
  await admin.openMetrics();

  await admin.expectMetrics();
  await admin.expectApplicationStatus();
});

test('administration keeps its shell hidden for an anonymous session', async ({ page }) => {
  const admin = new AdminPage(page);
  await page.route('**/api/auth/session', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ authenticated: false }),
    }),
  );
  await admin.openMetrics();

  await admin.expectSignInPrompt();
  await admin.expectMetricsHidden();
  await admin.expectNavigationHidden();
});

test('administration denies an authenticated user without organization access', async ({
  page,
}) => {
  const admin = new AdminPage(page);
  await page.route('**/api/auth/session', (route) =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify(authenticatedSession) }),
  );
  await admin.openMetrics();

  await admin.expectNoOrganizationAccess();
  await admin.expectMetricsHidden();
});

test('portal keeps its static shell offline while API traffic stays network-only', async ({
  context,
  page,
}) => {
  const portal = new PortalPage(page);
  await portal.openBooking();
  await page.evaluate(async () => navigator.serviceWorker.ready);
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
    .toBe(true);

  await context.setOffline(true);
  await page.reload();
  await portal.expectBooking();

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

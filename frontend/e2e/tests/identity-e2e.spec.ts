import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { expect, test, type Page } from '@playwright/test';

import { AdminPage } from '../pages/admin-page';
import { KeycloakLoginPage } from '../pages/keycloak-login-page';
import { PortalPage } from '../pages/portal-page';
import {
  bootstrapSession,
  currentSession,
  inspectBrowserSecurityState,
  problemResponse,
  sessionCookie,
} from '../support/security-inspection';

const identityE2EEnabled = process.env.IDENTITY_E2E === 'true';
const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url));

function requiredEnvironment(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required identity E2E environment variable: ${name}`);
  return value;
}

async function loginPortal(page: Page, username: string, password: string): Promise<PortalPage> {
  const portal = new PortalPage(page);
  await portal.openAppointments();
  await portal.expectSignInPrompt();
  await portal.beginSignIn();
  await new KeycloakLoginPage(page).signIn(username, password);
  await portal.expectAppointments();
  return portal;
}

async function loginAdmin(page: Page, username: string, password: string): Promise<AdminPage> {
  const admin = new AdminPage(page);
  await admin.openMetrics();
  await admin.expectSignInPrompt();
  await admin.beginSignIn();
  await new KeycloakLoginPage(page).signIn(username, password);
  await admin.expectNoOrganizationAccess();
  return admin;
}

function restartBackend(): void {
  const project = requiredEnvironment('IDENTITY_E2E_COMPOSE_PROJECT');
  const compose = [
    'compose',
    '--project-name',
    project,
    '--env-file',
    'infra/.env.example',
    '--env-file',
    'infra/keycloak/environments/test.env.example',
    '-f',
    'infra/compose.yaml',
  ];
  execFileSync('docker', [...compose, 'restart', 'backend'], {
    cwd: repositoryRoot,
    stdio: 'inherit',
  });
  execFileSync('docker', [...compose, 'up', '-d', '--wait', 'backend'], {
    cwd: repositoryRoot,
    stdio: 'inherit',
  });
}

function recreateBackendForSessionExpiry(): void {
  const project = requiredEnvironment('IDENTITY_E2E_COMPOSE_PROJECT');
  const compose = [
    'compose',
    '--project-name',
    project,
    '--env-file',
    'infra/.env.example',
    '--env-file',
    'infra/keycloak/environments/test.env.example',
    '-f',
    'infra/compose.yaml',
  ];
  execFileSync('docker', [...compose, 'up', '-d', '--force-recreate', '--wait', 'backend'], {
    cwd: repositoryRoot,
    env: {
      ...process.env,
      SMART_BUSINESS_SESSION_ABSOLUTE_TIMEOUT: '30s',
      SMART_BUSINESS_SESSION_IDLE_TIMEOUT: '3s',
    },
    stdio: 'inherit',
  });
}

test.describe.serial('identity boundary', () => {
  test.skip(!identityE2EEnabled, 'Run with make identity-e2e against the isolated identity stack.');

  let customerUsername: string;
  let customerPassword: string;
  let adminUsername: string;
  let adminPassword: string;

  test.beforeAll(() => {
    customerUsername = requiredEnvironment('KEYCLOAK_TEST_CUSTOMER_USERNAME');
    customerPassword = requiredEnvironment('KEYCLOAK_TEST_CUSTOMER_PASSWORD');
    adminUsername = requiredEnvironment('KEYCLOAK_TEST_ADMIN_USERNAME');
    adminPassword = requiredEnvironment('KEYCLOAK_TEST_ADMIN_PASSWORD');
  });

  test('rotates the Portal session, provisions an idempotent identity, and logs out', async ({
    context,
    page,
  }) => {
    const portal = new PortalPage(page);
    await portal.openBooking();
    await bootstrapSession(page);
    const anonymousCookie = await sessionCookie(context, portal.baseUrl);

    await portal.openAppointments();
    await portal.beginSignIn();
    await new KeycloakLoginPage(page).signIn(customerUsername, customerPassword);
    await portal.expectAppointments();
    const firstSession = await currentSession(page);
    const authenticatedCookie = await sessionCookie(context, portal.baseUrl);

    expect(firstSession.authenticated).toBe(true);
    expect(firstSession.actor?.organizationAccess).toEqual([]);
    expect(authenticatedCookie.value).not.toBe(anonymousCookie.value);
    expect(authenticatedCookie.httpOnly).toBe(true);
    expect(authenticatedCookie.path).toBe('/');
    expect(authenticatedCookie.sameSite).toBe('Lax');
    expect(authenticatedCookie.secure).toBe(false);

    await portal.signOut();
    await new KeycloakLoginPage(page).confirmLogoutIfRequired();
    await expect(page).toHaveURL(new RegExp(portal.baseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    await portal.openAppointments();
    await portal.expectSignInPrompt();

    await portal.beginSignIn();
    await new KeycloakLoginPage(page).signIn(customerUsername, customerPassword);
    await portal.expectAppointments();
    const secondSession = await currentSession(page);
    expect(secondSession.actor?.id).toBe(firstSession.actor?.id);
    expect(secondSession.actor?.organizationAccess).toEqual([]);
  });

  test('completes Admin login and logout without granting organization access', async ({
    page,
  }) => {
    const admin = await loginAdmin(page, adminUsername, adminPassword);
    const authenticated = await currentSession(page);

    expect(authenticated.authenticated).toBe(true);
    expect(authenticated.actor?.globalRoles).toEqual(['platform_admin']);
    expect(authenticated.actor?.organizationAccess).toEqual([]);

    await admin.signOut();
    await new KeycloakLoginPage(page).confirmLogoutIfRequired();
    await expect(page).toHaveURL(new RegExp(admin.baseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    await admin.openMetrics();
    await admin.expectSignInPrompt();
  });

  test('rejects missing CSRF and invalid browser sessions with standardized problems', async ({
    context,
    page,
  }) => {
    const portal = new PortalPage(page);
    await portal.openBooking();

    const csrfFailure = await problemResponse(page, '/api/auth/logout', { method: 'POST' });
    expect(csrfFailure.status).toBe(403);
    expect(csrfFailure.body.code).toBe('access_denied');

    await context.clearCookies();
    const invalidSession = await problemResponse(page, '/api/private/identity-boundary', {
      method: 'GET',
    });
    expect(invalidSession.status).toBe(401);
    expect(invalidSession.body.code).toBe('authentication_required');
  });

  test('preserves a JDBC-backed authenticated session across a backend restart', async ({
    page,
  }) => {
    test.setTimeout(90_000);
    const portal = await loginPortal(page, customerUsername, customerPassword);
    restartBackend();

    await expect
      .poll(() => currentSession(page), { timeout: 30_000 })
      .toMatchObject({ authenticated: true });
    await page.reload();
    await portal.expectAppointments();
  });

  test('expires inactive sessions and denies the protected API', async ({ page }) => {
    test.setTimeout(120_000);
    recreateBackendForSessionExpiry();
    const portal = await loginPortal(page, customerUsername, customerPassword);
    await page.waitForTimeout(5_000);

    await expect.poll(() => currentSession(page)).toMatchObject({ authenticated: false });

    const expired = await problemResponse(page, '/api/private/identity-boundary', {
      method: 'GET',
    });
    expect(expired.status).toBe(401);
    expect(expired.body.code).toBe('authentication_required');

    await portal.openAppointments();
    await portal.expectSignInPrompt();
  });

  test('keeps identity data out of browser storage, URLs, and PWA API caches', async ({
    context,
    page,
  }) => {
    const requestedUrls: string[] = [];
    page.on('request', (request) => requestedUrls.push(request.url()));
    const portal = await loginPortal(page, customerUsername, customerPassword);
    await page.evaluate(async () => navigator.serviceWorker.ready);

    const browserState = await inspectBrowserSecurityState(page);
    const cookies = await context.cookies(portal.baseUrl);
    const serializedState = JSON.stringify(browserState);

    expect(serializedState).not.toMatch(
      /access[_-]?token|refresh[_-]?token|id[_-]?token|eyJ[a-zA-Z0-9_-]+/i,
    );
    expect(browserState.cacheEntries).not.toEqual(
      expect.arrayContaining([expect.stringMatching(/\/api\//)]),
    );
    expect(requestedUrls.join('\n')).not.toMatch(/access_token|refresh_token|id_token/i);
    expect(cookies.map((cookie) => cookie.value).join('\n')).not.toMatch(/^eyJ[a-zA-Z0-9_-]+/m);
  });
});

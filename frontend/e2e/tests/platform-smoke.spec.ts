import { expect, test } from '@playwright/test';

const portalBaseUrl = process.env.PORTAL_BASE_URL ?? 'http://127.0.0.1:5173';
const adminBaseUrl = process.env.ADMIN_BASE_URL ?? 'http://127.0.0.1:5174';

test('portal loads a deep route and reaches the API through its proxy', async ({ page }) => {
  await page.goto(`${portalBaseUrl}/book`);

  await expect(page.getByRole('heading', { name: 'Book your next service' })).toBeVisible();
  await expect(page.locator('footer')).toContainText('smart-business');
});

test('administration loads a deep route and reaches the API through its proxy', async ({
  page,
}) => {
  await page.goto(`${adminBaseUrl}/metrics`);

  await expect(page.getByRole('heading', { name: 'Metrics', level: 1 })).toBeVisible();
  await expect(page.locator('.app-status')).toContainText('smart-business');
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

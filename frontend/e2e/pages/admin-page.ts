import { expect, type Page } from '@playwright/test';

import { ApplicationPage } from './application-page';

export class AdminPage extends ApplicationPage {
  constructor(page: Page, baseUrl = process.env.ADMIN_BASE_URL ?? 'http://127.0.0.1:5174') {
    super(page, baseUrl);
  }

  async openMetrics(): Promise<void> {
    await this.visit('/metrics');
  }

  async expectMetrics(): Promise<void> {
    await expect(this.page.getByRole('heading', { name: 'Metrics', level: 1 })).toBeVisible();
  }

  async expectApplicationStatus(): Promise<void> {
    await expect(this.page.locator('.app-status')).toContainText('smart-business');
  }

  async expectMetricsHidden(): Promise<void> {
    await expect(this.page.getByRole('heading', { name: 'Metrics', level: 1 })).toHaveCount(0);
  }

  async expectNoOrganizationAccess(): Promise<void> {
    await expect(this.page.getByRole('heading', { name: 'No organization access' })).toBeVisible();
  }

  async expectNavigationHidden(): Promise<void> {
    await expect(
      this.page.getByRole('navigation', { name: 'Administration navigation' }),
    ).toHaveCount(0);
  }
}

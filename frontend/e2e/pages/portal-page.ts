import { expect, type Page } from '@playwright/test';

import { ApplicationPage } from './application-page';

export class PortalPage extends ApplicationPage {
  constructor(page: Page, baseUrl = process.env.PORTAL_BASE_URL ?? 'http://127.0.0.1:5173') {
    super(page, baseUrl);
  }

  async openBooking(): Promise<void> {
    await this.visit('/book');
  }

  async openAppointments(): Promise<void> {
    await this.visit('/appointments');
  }

  async openProfessionalSchedule(): Promise<void> {
    await this.visit('/professional/schedule');
  }

  async expectBooking(): Promise<void> {
    await expect(this.page.getByRole('heading', { name: 'Book your next service' })).toBeVisible();
  }

  async expectFooterBrand(): Promise<void> {
    await expect(this.page.locator('footer')).toContainText('smart-business');
  }

  async expectAppointments(): Promise<void> {
    await expect(this.page.getByRole('heading', { name: 'My appointments' })).toBeVisible();
  }

  async expectAppointmentsHidden(): Promise<void> {
    await expect(this.page.getByRole('heading', { name: 'My appointments' })).toHaveCount(0);
  }

  async expectNoOrganizationAccess(): Promise<void> {
    await expect(this.page.getByRole('heading', { name: 'No organization access' })).toBeVisible();
  }

  async expectProfessionalScheduleHidden(): Promise<void> {
    await expect(this.page.getByRole('heading', { name: 'Professional schedule' })).toHaveCount(0);
  }

  async expectExpiredSession(): Promise<void> {
    await expect(this.page.getByRole('heading', { name: 'Your session has ended' })).toBeVisible();
  }
}

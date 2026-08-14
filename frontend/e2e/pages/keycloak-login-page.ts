import { expect, type Page } from '@playwright/test';

export class KeycloakLoginPage {
  constructor(private readonly page: Page) {}

  async signIn(username: string, password: string): Promise<void> {
    await expect(this.page.locator('#username')).toBeVisible();
    await this.page.locator('#username').fill(username);
    await this.page.locator('#password').fill(password);
    await this.page.locator('#kc-login').click();
  }

  async confirmLogoutIfRequired(): Promise<void> {
    const logout = this.page.locator('#kc-logout');
    try {
      await logout.waitFor({ state: 'visible', timeout: 3_000 });
      await logout.click();
    } catch {
      // Keycloak redirects immediately when its realm does not require confirmation.
    }

    const continueToApplication = this.page.getByRole('link', {
      name: /back to application|continue/i,
    });
    try {
      await continueToApplication.waitFor({ state: 'visible', timeout: 3_000 });
      await continueToApplication.click();
    } catch {
      // The successful logout page is optional and may redirect automatically.
    }
  }
}

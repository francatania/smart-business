import { expect, type Page } from '@playwright/test';

export abstract class ApplicationPage {
  protected constructor(
    protected readonly page: Page,
    readonly baseUrl: string,
  ) {}

  protected async visit(path: string): Promise<void> {
    await this.page.goto(new URL(path, this.baseUrl).toString());
  }

  async expectSignInPrompt(): Promise<void> {
    await expect(this.page.getByRole('heading', { name: 'Sign in to continue' })).toBeVisible();
  }

  async beginSignIn(): Promise<void> {
    await this.page
      .locator('section[aria-live="polite"]')
      .getByRole('button', { name: 'Sign in', exact: true })
      .click();
  }

  async signOut(): Promise<void> {
    const applicationOrigin = new URL(this.baseUrl).origin;
    const keycloakNavigation = this.page.waitForURL((url) => url.origin !== applicationOrigin, {
      timeout: 10_000,
    });
    const signOut = this.page.getByRole('button', { name: 'Sign out' });
    if ((await signOut.count()) > 0) {
      await signOut.click();
    } else {
      await this.page.evaluate(async () => {
        const csrf = await fetch('/api/auth/csrf', { credentials: 'include' });
        if (!csrf.ok) throw new Error('CSRF bootstrap failed.');
        const token = (await csrf.json()) as { parameterName: string; token: string };
        const form = document.createElement('form');
        form.action = '/api/auth/logout';
        form.method = 'post';
        const field = document.createElement('input');
        field.name = token.parameterName;
        field.type = 'hidden';
        field.value = token.token;
        form.append(field);
        document.body.append(form);
        form.submit();
      });
    }
    await keycloakNavigation;
  }
}

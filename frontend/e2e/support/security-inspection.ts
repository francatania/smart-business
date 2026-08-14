import { expect, type BrowserContext, type Page } from '@playwright/test';

export interface SessionResponse {
  actor?: {
    globalRoles: string[];
    id: string;
    organizationAccess: unknown[];
  };
  authenticated: boolean;
}

export interface BrowserRequestOptions {
  body?: string;
  headers?: Record<string, string>;
  method?: string;
}

function problemBody(value: unknown): { code?: string } {
  if (typeof value !== 'object' || value === null) return {};
  const code = (value as Record<string, unknown>).code;
  return typeof code === 'string' ? { code } : {};
}

export async function bootstrapSession(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const response = await fetch('/api/auth/csrf', { credentials: 'include' });
    if (!response.ok) throw new Error('CSRF bootstrap failed.');
  });
}

export async function currentSession(page: Page): Promise<SessionResponse> {
  const value: unknown = await page.evaluate(async () => {
    const response = await fetch('/api/auth/session', {
      cache: 'no-store',
      credentials: 'include',
    });
    const body: unknown = await response.json();
    return body;
  });
  if (typeof value !== 'object' || value === null)
    throw new Error('Session response was not an object.');
  return value as SessionResponse;
}

export async function problemResponse(
  page: Page,
  path: string,
  options: BrowserRequestOptions,
): Promise<{
  body: { code?: string };
  status: number;
}> {
  const result: { body: unknown; status: number } = await page.evaluate(
    async ({ options, path }) => {
      const response = await fetch(path, { ...options, credentials: 'include' });
      const body: unknown = await response.json();
      return { body, status: response.status };
    },
    { options, path },
  );
  return { body: problemBody(result.body), status: result.status };
}

export async function sessionCookie(context: BrowserContext, origin: string) {
  const cookie = (await context.cookies(origin)).find(
    (candidate) => candidate.name === 'SBSESSION',
  );
  expect(cookie).toBeDefined();
  return cookie!;
}

export async function inspectBrowserSecurityState(page: Page) {
  return page.evaluate(async () => {
    const cacheEntries = await Promise.all(
      (await caches.keys()).map(async (cacheName) => {
        const cache = await caches.open(cacheName);
        return (await cache.keys()).map((request) => request.url);
      }),
    );
    return {
      cacheEntries: cacheEntries.flat(),
      localStorage: Object.entries(localStorage),
      sessionStorage: Object.entries(sessionStorage),
    };
  });
}

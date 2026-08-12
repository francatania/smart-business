import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('portal PWA API policy', () => {
  it('keeps API responses network-only and out of the navigation fallback', () => {
    const config = readFileSync(resolve(process.cwd(), 'vite.config.ts'), 'utf8');

    expect(config).toMatch(/navigateFallbackDenylist: \[\/\^\\\/api/);
    expect(config).toMatch(/handler: 'NetworkOnly'/);
  });
});

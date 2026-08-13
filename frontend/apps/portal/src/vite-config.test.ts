import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('portal PWA API policy', () => {
  it('keeps API and OIDC navigation traffic out of the service-worker fallback', () => {
    const config = readFileSync(resolve(process.cwd(), 'vite.config.ts'), 'utf8');

    expect(config).toMatch(/navigateFallbackDenylist: \[\/\^\\\/\(\?:api\|oauth2\)/);
    expect(config).toMatch(/handler: 'NetworkOnly'/);
  });
});

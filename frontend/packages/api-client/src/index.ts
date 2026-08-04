import createClient from 'openapi-fetch';

import type { paths } from './generated/schema.js';

export const defaultApiBaseUrl = '/api';

export function createApiClient(baseUrl: string = defaultApiBaseUrl) {
  return createClient<paths>({ baseUrl, credentials: 'include' });
}

export type ApiClient = ReturnType<typeof createApiClient>;

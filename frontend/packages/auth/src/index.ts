export type SessionStatus = 'loading' | 'anonymous' | 'authenticated';

export interface BrowserSession {
  status: SessionStatus;
  displayName?: string;
}

export function fetchWithSession(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  return fetch(input, { ...init, credentials: 'include' });
}

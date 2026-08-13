import type { components } from '@smart-business/api-client';

export type AuthSurface = 'portal' | 'admin';
export type SessionStatus =
  | 'loading'
  | 'anonymous'
  | 'authenticated'
  | 'expired'
  | 'access-denied'
  | 'unavailable';

export type SessionResponse = components['schemas']['SessionResponse'];
export type CurrentActor = components['schemas']['CurrentActor'];
export type CsrfTokenResponse = components['schemas']['CsrfTokenResponse'];

export interface AuthState {
  status: SessionStatus;
  session?: SessionResponse;
  actor?: CurrentActor;
}

export interface BrowserAuthClientOptions {
  apiBaseUrl?: string;
  surface: AuthSurface;
  fetch?: typeof globalThis.fetch;
  location?: Pick<Location, 'assign' | 'hash' | 'origin' | 'pathname' | 'search'>;
  document?: Pick<Document, 'body' | 'createElement'>;
}

interface CsrfToken {
  headerName: string;
  parameterName: string;
  token: string;
}

type StateListener = () => void;

const unsafeMethods = new Set(['DELETE', 'PATCH', 'POST', 'PUT']);

function normaliseApiBaseUrl(apiBaseUrl: string): string {
  return apiBaseUrl.endsWith('/') ? apiBaseUrl.slice(0, -1) : apiBaseUrl;
}

export function isSafeReturnTo(returnTo: string): boolean {
  return (
    returnTo.startsWith('/') &&
    !returnTo.startsWith('//') &&
    !returnTo.includes('\\') &&
    !/[\r\n]/.test(returnTo)
  );
}

export function currentRelativeLocation(
  location: Pick<Location, 'hash' | 'pathname' | 'search'>,
): string {
  const returnTo = `${location.pathname}${location.search}${location.hash}`;
  return isSafeReturnTo(returnTo) ? returnTo : '/';
}

export class BrowserAuthClient {
  private readonly apiBaseUrl: string;
  private readonly document: Pick<Document, 'body' | 'createElement'>;
  private readonly fetch: typeof globalThis.fetch;
  private readonly location: Pick<Location, 'assign' | 'hash' | 'origin' | 'pathname' | 'search'>;
  private readonly listeners = new Set<StateListener>();
  private csrf?: CsrfToken;
  private state: AuthState = { status: 'loading' };

  constructor(private readonly options: BrowserAuthClientOptions) {
    this.apiBaseUrl = normaliseApiBaseUrl(options.apiBaseUrl ?? '/api');
    this.fetch = options.fetch ?? ((input, init) => globalThis.fetch(input, init));
    this.location = options.location ?? globalThis.location;
    this.document = options.document ?? globalThis.document;
  }

  getState(): AuthState {
    return this.state;
  }

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async loadSession(): Promise<AuthState> {
    try {
      const response = await this.fetch(this.endpoint('/auth/session'), {
        cache: 'no-store',
        credentials: 'include',
      });

      if (!response.ok) {
        return this.setState({ status: response.status === 401 ? 'expired' : 'unavailable' });
      }

      const session = (await response.json()) as SessionResponse;
      return this.setState(
        session.authenticated && session.actor
          ? { actor: session.actor, session, status: 'authenticated' }
          : { session, status: 'anonymous' },
      );
    } catch {
      return this.setState({ status: 'unavailable' });
    }
  }

  async getCsrfToken(): Promise<CsrfToken> {
    const response = await this.fetch(this.endpoint('/auth/csrf'), {
      cache: 'no-store',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('The CSRF token could not be retrieved.');
    }

    const token = (await response.json()) as CsrfTokenResponse;
    if (!token.token || !token.headerName || !token.parameterName) {
      throw new Error('The CSRF token response was incomplete.');
    }

    this.csrf = {
      headerName: token.headerName,
      parameterName: token.parameterName,
      token: token.token,
    };
    return this.csrf;
  }

  async authFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
    const method = (init.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
    const requiresCsrf = unsafeMethods.has(method) && this.isSameOrigin(input);
    const response = await this.request(input, init, requiresCsrf);

    if (response.status === 401) {
      this.csrf = undefined;
      this.setState({ status: 'expired' });
      return response;
    }

    if (response.status !== 403) {
      return response;
    }

    if (requiresCsrf) {
      this.csrf = undefined;
      const retryResponse = await this.request(input, init, true);
      if (retryResponse.status !== 403) {
        if (retryResponse.status === 401) {
          this.csrf = undefined;
          this.setState({ status: 'expired' });
        }
        return retryResponse;
      }
      void response.body?.cancel();
    }

    this.setState({ status: 'access-denied' });
    return response;
  }

  startLogin(returnTo = currentRelativeLocation(this.location)): void {
    const safeReturnTo = isSafeReturnTo(returnTo) ? returnTo : '/';
    const loginUrl = new URL(
      this.endpoint(`/auth/login/${this.options.surface}`),
      this.location.origin,
    );
    loginUrl.searchParams.set('returnTo', safeReturnTo);
    this.location.assign(loginUrl.toString());
  }

  async logout(): Promise<void> {
    const csrf = this.csrf ?? (await this.getCsrfToken());
    const form = this.document.createElement('form');
    form.method = 'post';
    form.action = this.endpoint('/auth/logout');
    form.style.display = 'none';

    const field = this.document.createElement('input');
    field.name = csrf.parameterName;
    field.type = 'hidden';
    field.value = csrf.token;
    form.append(field);
    this.document.body.append(form);

    this.csrf = undefined;
    this.setState({ status: 'anonymous' });
    form.submit();
  }

  private async request(
    input: RequestInfo | URL,
    init: RequestInit,
    requiresCsrf: boolean,
  ): Promise<Response> {
    const headers = new Headers(init.headers);
    if (requiresCsrf) {
      const csrf = this.csrf ?? (await this.getCsrfToken());
      headers.set(csrf.headerName, csrf.token);
    }

    return this.fetch(input, { ...init, credentials: 'include', headers });
  }

  private endpoint(path: string): string {
    return `${this.apiBaseUrl}${path}`;
  }

  private isSameOrigin(input: RequestInfo | URL): boolean {
    const url = new URL(
      input instanceof Request ? input.url : input.toString(),
      this.location.origin,
    );
    return url.origin === this.location.origin;
  }

  private setState(state: AuthState): AuthState {
    this.state = state;
    this.listeners.forEach((listener) => listener());
    return state;
  }
}

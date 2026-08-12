import { BrowserAuthClient, currentRelativeLocation, isSafeReturnTo } from './client.js';

function response(body: unknown, status = 200): Response {
  return new Response(body === undefined ? undefined : JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    status,
  });
}

function createLocation() {
  return {
    assign: vi.fn(),
    hash: '#details',
    origin: 'http://portal.localhost:5173',
    pathname: '/appointments',
    search: '?tab=next',
  };
}

describe('BrowserAuthClient', () => {
  it('loads anonymous and authenticated sessions without persisting browser state', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(response({ authenticated: false }))
      .mockResolvedValueOnce(
        response({
          actor: {
            absoluteExpiresAt: '2026-08-12T18:00:00Z',
            assuranceLevel: 'standard',
            authenticatedAt: '2026-08-12T10:00:00Z',
            displayName: 'Franco',
            globalRoles: [],
            id: '0e18c9e2-1ef4-4e67-8e4c-7b8c6a44713e',
            organizationAccess: [],
            status: 'ACTIVE',
          },
          authenticated: true,
        }),
      );
    const localStorageSetItem = vi.spyOn(Storage.prototype, 'setItem');
    const sessionStorageSetItem = vi.spyOn(Storage.prototype, 'setItem');
    const client = new BrowserAuthClient({ fetch, location: createLocation(), surface: 'portal' });

    await expect(client.loadSession()).resolves.toMatchObject({ status: 'anonymous' });
    await expect(client.loadSession()).resolves.toMatchObject({
      actor: { displayName: 'Franco' },
      status: 'authenticated',
    });

    expect(localStorageSetItem).not.toHaveBeenCalled();
    expect(sessionStorageSetItem).not.toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledWith('/api/auth/session', {
      cache: 'no-store',
      credentials: 'include',
    });
  });

  it('attaches an in-memory CSRF token only to unsafe same-origin requests', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(
        response({ headerName: 'X-CSRF-TOKEN', parameterName: '_csrf', token: 'csrf-value' }),
      )
      .mockResolvedValue(response({ ok: true }));
    const client = new BrowserAuthClient({ fetch, location: createLocation(), surface: 'portal' });

    await client.authFetch('/api/bookings', { method: 'POST' });
    await client.authFetch('/api/system/info');

    const postOptions = fetch.mock.calls[1]?.[1] as RequestInit;
    expect(new Headers(postOptions.headers).get('X-CSRF-TOKEN')).toBe('csrf-value');
    const getOptions = fetch.mock.calls[2]?.[1] as RequestInit;
    expect(new Headers(getOptions.headers).get('X-CSRF-TOKEN')).toBeNull();
  });

  it('refreshes CSRF once after a forbidden unsafe request before denying access', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(
        response({ headerName: 'X-CSRF-TOKEN', parameterName: '_csrf', token: 'old' }),
      )
      .mockResolvedValueOnce(response(undefined, 403))
      .mockResolvedValueOnce(
        response({ headerName: 'X-CSRF-TOKEN', parameterName: '_csrf', token: 'new' }),
      )
      .mockResolvedValueOnce(response(undefined, 403));
    const client = new BrowserAuthClient({ fetch, location: createLocation(), surface: 'portal' });

    await expect(client.authFetch('/api/bookings', { method: 'POST' })).resolves.toMatchObject({
      status: 403,
    });

    expect(client.getState()).toEqual({ status: 'access-denied' });
    expect(fetch).toHaveBeenCalledTimes(4);
  });

  it('marks an expired session on unauthorized API responses', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(response(undefined, 401));
    const client = new BrowserAuthClient({ fetch, location: createLocation(), surface: 'portal' });

    await client.authFetch('/api/appointments');

    expect(client.getState()).toEqual({ status: 'expired' });
  });

  it('uses a full-page, relative login navigation and rejects unsafe paths', () => {
    const location = createLocation();
    const client = new BrowserAuthClient({ location, surface: 'admin' });

    client.startLogin();
    client.startLogin('https://example.test');

    expect(location.assign).toHaveBeenNthCalledWith(
      1,
      'http://portal.localhost:5173/api/auth/login/admin?returnTo=%2Fappointments%3Ftab%3Dnext%23details',
    );
    expect(location.assign).toHaveBeenLastCalledWith(
      'http://portal.localhost:5173/api/auth/login/admin?returnTo=%2F',
    );
    expect(isSafeReturnTo('//outside.test')).toBe(false);
    expect(currentRelativeLocation(location)).toBe('/appointments?tab=next#details');
  });

  it('submits logout through a transient CSRF form', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(
        response({ headerName: 'X-CSRF-TOKEN', parameterName: '_csrf', token: 'csrf-value' }),
      );
    const formSubmit = vi
      .spyOn(HTMLFormElement.prototype, 'submit')
      .mockImplementation(() => undefined);
    const client = new BrowserAuthClient({ fetch, location: createLocation(), surface: 'portal' });

    await client.logout();

    const form = document.querySelector('form[action="/api/auth/logout"]');
    expect(form).not.toBeNull();
    expect(form?.querySelector('input[name="_csrf"]')).toHaveValue('csrf-value');
    expect(formSubmit).toHaveBeenCalledOnce();
    expect(client.getState()).toEqual({ status: 'anonymous' });
  });
});

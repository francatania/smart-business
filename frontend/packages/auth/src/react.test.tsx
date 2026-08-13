import { QueryClient } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';

import { BrowserAuthClient } from './client.js';
import { AuthProvider, useAuth } from './react.js';

function State() {
  return <span>{useAuth().status}</span>;
}

describe('AuthProvider', () => {
  it('loads the session and clears authenticated queries after expiration', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryDefaults(['private'], { meta: { authenticated: true } });
    queryClient.setQueryData(['private'], 'private');
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(new Response(undefined, { status: 401 }));
    const client = new BrowserAuthClient({ fetch, surface: 'portal' });

    render(
      <AuthProvider
        client={client}
        keycloakAccountUrl="http://auth.localhost:8081/realms/smart-business/account/"
        queryClient={queryClient}
        surface="portal"
      >
        <State />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByText('expired')).toBeInTheDocument());
    await waitFor(() => expect(queryClient.getQueryData(['private'])).toBeUndefined());
  });
});

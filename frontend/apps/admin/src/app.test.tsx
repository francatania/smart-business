import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { App } from './app';

const auth = vi.hoisted(() => ({
  refreshSession: vi.fn(),
  signIn: vi.fn(),
  state: {} as { actor?: { organizationAccess: unknown[] }; status: string },
}));

vi.mock('@smart-business/auth', () => ({
  useAuth: () => auth.state,
  useAuthActions: () => ({
    refreshSession: auth.refreshSession,
    signIn: auth.signIn,
  }),
}));
vi.mock('./components/app-status', () => ({ AppStatus: () => <div>Test status</div> }));
vi.mock('./components/session-controls', () => ({
  SessionControls: () => <div>Session controls</div>,
}));

function authenticatedActor(organizationAccess: unknown[] = []) {
  return { organizationAccess };
}

function renderRoute(route: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('administration routes', () => {
  beforeEach(() => {
    auth.refreshSession.mockReset();
    auth.signIn.mockReset();
    auth.state = { status: 'anonymous' };
  });

  it.each([
    ['/calendar', 'Calendar'],
    ['/customers', 'Customers'],
    ['/configuration', 'Configuration'],
    ['/metrics', 'Metrics'],
  ])('renders %s', (route, heading) => {
    auth.state = {
      actor: authenticatedActor([{ capabilities: [], organizationId: 'organization-1' }]),
      status: 'authenticated',
    };
    renderRoute(route);
    expect(screen.getByRole('heading', { name: heading, level: 1 })).toBeInTheDocument();
  });

  it('keeps the administration shell hidden while the session is loading', () => {
    auth.state = { status: 'loading' };
    renderRoute('/metrics');

    expect(screen.getByRole('heading', { name: 'Checking your access' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Metrics', level: 1 })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('navigation', { name: 'Administration navigation' }),
    ).not.toBeInTheDocument();
  });

  it.each([
    ['anonymous', 'Sign in to continue', 'Sign in'],
    ['expired', 'Your session has ended', 'Sign in again'],
    ['access-denied', 'Access denied', 'Sign in again'],
  ])(
    'shows the %s state without administration content and starts login',
    (status, heading, action) => {
      auth.state = { status };
      renderRoute('/metrics');

      expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Metrics', level: 1 })).not.toBeInTheDocument();
      expect(
        screen.queryByRole('navigation', { name: 'Administration navigation' }),
      ).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: action }));
      expect(auth.signIn).toHaveBeenCalledOnce();
    },
  );

  it('allows retrying without rendering the administration shell when the session is unavailable', () => {
    auth.state = { status: 'unavailable' };
    renderRoute('/metrics');

    expect(screen.getByRole('heading', { name: 'Session unavailable' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Metrics', level: 1 })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(auth.refreshSession).toHaveBeenCalledOnce();
  });

  it('denies authenticated users without an active organization', () => {
    auth.state = { actor: authenticatedActor(), status: 'authenticated' };
    renderRoute('/metrics');

    expect(screen.getByRole('heading', { name: 'No organization access' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Metrics', level: 1 })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('navigation', { name: 'Administration navigation' }),
    ).not.toBeInTheDocument();
  });
});

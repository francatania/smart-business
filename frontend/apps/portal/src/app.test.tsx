import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { App } from './app';

const auth = vi.hoisted(() => ({
  accountSecurityUrl: 'https://auth.example.test/account/',
  refreshSession: vi.fn(),
  signIn: vi.fn(),
  state: {} as { actor?: unknown; status: string },
}));

vi.mock('@smart-business/auth', () => ({
  useAuth: () => auth.state,
  useAuthActions: () => ({
    accountSecurityUrl: auth.accountSecurityUrl,
    refreshSession: auth.refreshSession,
    signIn: auth.signIn,
    signOut: vi.fn(),
  }),
}));
vi.mock('./components/app-status', () => ({ AppStatus: () => <footer>Test status</footer> }));
vi.mock('./components/session-controls', () => ({
  SessionControls: () => <div>Session controls</div>,
}));

function authenticatedActor(organizationAccess: unknown[] = [], verifiedEmail?: string) {
  return {
    absoluteExpiresAt: '2026-08-16T18:00:00Z',
    assuranceLevel: 'standard',
    authenticatedAt: '2026-08-13T10:00:00Z',
    displayName: 'Franco',
    globalRoles: [],
    id: '0e18c9e2-1ef4-4e67-8e4c-7b8c6a44713e',
    organizationAccess,
    status: 'ACTIVE',
    verifiedEmail,
  };
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

describe('portal routes', () => {
  beforeEach(() => {
    auth.refreshSession.mockReset();
    auth.signIn.mockReset();
    auth.state = { status: 'anonymous' };
  });

  it('keeps public booking available without a session', () => {
    renderRoute('/book');

    expect(screen.getByRole('heading', { name: 'Book your next service' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Book' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'My appointments' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Professional schedule' })).not.toBeInTheDocument();
  });

  it('keeps protected content hidden while the session is loading', () => {
    auth.state = { status: 'loading' };
    renderRoute('/appointments');

    expect(screen.getByRole('heading', { name: 'Checking your access' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'My appointments' })).not.toBeInTheDocument();
  });

  it('renders customer content and authenticated navigation after session confirmation', () => {
    auth.state = { status: 'authenticated', actor: authenticatedActor() };
    renderRoute('/appointments');

    expect(screen.getByRole('heading', { name: 'My appointments' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'My appointments' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Professional schedule' })).not.toBeInTheDocument();
  });

  it.each([
    ['anonymous', 'Sign in to continue', 'Sign in'],
    ['expired', 'Your session has ended', 'Sign in again'],
    ['access-denied', 'Access denied', 'Sign in again'],
  ])('shows the %s protected-route state and starts login', (status, heading, action) => {
    auth.state = { status };
    renderRoute('/appointments');

    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'My appointments' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: action }));
    expect(auth.signIn).toHaveBeenCalledOnce();
  });

  it('allows retrying without rendering protected content when the session is unavailable', () => {
    auth.state = { status: 'unavailable' };
    renderRoute('/appointments');

    expect(screen.getByRole('heading', { name: 'Session unavailable' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'My appointments' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(auth.refreshSession).toHaveBeenCalledOnce();
  });

  it('denies the professional placeholder when the user has no organization access', () => {
    auth.state = { status: 'authenticated', actor: authenticatedActor() };
    renderRoute('/professional/schedule');

    expect(screen.getByRole('heading', { name: 'No organization access' })).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Professional schedule' }),
    ).not.toBeInTheDocument();
  });

  it('renders the professional placeholder and navigation with organization access', () => {
    auth.state = {
      status: 'authenticated',
      actor: authenticatedActor([
        { capabilities: [], organizationId: '28ff2b8a-bf6c-4c37-9f8c-85950e8a2e54' },
      ]),
    };
    renderRoute('/professional/schedule');

    expect(screen.getByRole('heading', { name: 'Professional schedule' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Professional schedule' })).toBeInTheDocument();
  });

  it('offers optional passkey guidance to a verified user', () => {
    auth.state = {
      status: 'authenticated',
      actor: authenticatedActor([], 'franco@example.test'),
    };
    renderRoute('/appointments');

    expect(
      screen.getByRole('heading', { name: 'Make the next sign-in quicker' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Add a passkey' })).toHaveAttribute(
      'href',
      'https://auth.example.test/account/',
    );
  });
});

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { App } from './app';

vi.mock('./components/app-status', () => ({ AppStatus: () => <div>Test status</div> }));

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
  it.each([
    ['/calendar', 'Calendar'],
    ['/customers', 'Customers'],
    ['/configuration', 'Configuration'],
    ['/metrics', 'Metrics'],
  ])('renders %s', (route, heading) => {
    renderRoute(route);
    expect(screen.getByRole('heading', { name: heading, level: 1 })).toBeInTheDocument();
  });
});

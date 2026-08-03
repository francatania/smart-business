import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { App } from './app';

vi.mock('./components/app-status', () => ({ AppStatus: () => <footer>Test status</footer> }));

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
  it.each([
    ['/book', 'Book your next service'],
    ['/appointments', 'My appointments'],
    ['/professional/schedule', 'Professional schedule'],
  ])('renders %s', (route, heading) => {
    renderRoute(route);
    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
  });
});

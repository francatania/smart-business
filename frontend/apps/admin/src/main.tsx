import '@smart-business/ui/styles.css';
import './styles.css';

import { AuthProvider } from '@smart-business/auth';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import { App } from './app';
import { publicConfig } from './config';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider
        apiBaseUrl={publicConfig.apiBaseUrl}
        keycloakAccountUrl={publicConfig.keycloakAccountUrl}
        queryClient={queryClient}
        surface="admin"
      >
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);

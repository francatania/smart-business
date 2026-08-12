import '@smart-business/ui/styles.css';
import './styles.css';

import { AuthProvider } from '@smart-business/auth';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';

import { App } from './app';
import { publicConfig } from './config';

registerSW({ immediate: false });

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
        surface="portal"
      >
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);

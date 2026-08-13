import type { QueryClient } from '@tanstack/react-query';
import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from 'react';

import { BrowserAuthClient, type AuthState, type AuthSurface } from './client.js';

interface AuthContextValue {
  accountSecurityUrl: string;
  client: BrowserAuthClient;
  state: AuthState;
}

export interface AuthProviderProps extends PropsWithChildren {
  apiBaseUrl?: string;
  client?: BrowserAuthClient;
  keycloakAccountUrl: string;
  queryClient: QueryClient;
  surface: AuthSurface;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({
  apiBaseUrl,
  children,
  client: suppliedClient,
  keycloakAccountUrl,
  queryClient,
  surface,
}: AuthProviderProps) {
  const client = useMemo(
    () => suppliedClient ?? new BrowserAuthClient({ apiBaseUrl, surface }),
    [apiBaseUrl, suppliedClient, surface],
  );
  const state = useSyncExternalStore(client.subscribe.bind(client), client.getState.bind(client));

  useEffect(() => {
    void client.loadSession();
  }, [client]);

  useEffect(() => {
    if (state.status === 'authenticated' || state.status === 'loading') {
      return;
    }
    queryClient.removeQueries({ predicate: (query) => query.meta?.authenticated === true });
  }, [queryClient, state.status]);

  const value = useMemo(
    () => ({ accountSecurityUrl: keycloakAccountUrl, client, state }),
    [client, keycloakAccountUrl, state],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('Authentication hooks must be used within an AuthProvider.');
  }
  return context;
}

export function useAuth(): AuthState {
  return useAuthContext().state;
}

export function useAuthActions() {
  const { accountSecurityUrl, client } = useAuthContext();
  return {
    accountSecurityUrl,
    authFetch: client.authFetch.bind(client),
    refreshSession: client.loadSession.bind(client),
    signIn: client.startLogin.bind(client),
    signOut: client.logout.bind(client),
  };
}

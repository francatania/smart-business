const apiBaseUrl = import.meta.env.VITE_PUBLIC_API_BASE_URL || '/api';
const keycloakAccountUrl =
  import.meta.env.VITE_PUBLIC_KEYCLOAK_ACCOUNT_URL ||
  'http://auth.localhost:8081/realms/smart-business/account/';

export const publicConfig = Object.freeze({ apiBaseUrl, keycloakAccountUrl });

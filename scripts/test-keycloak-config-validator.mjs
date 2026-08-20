#!/usr/bin/env node

import {
  loadEnvironmentExamples,
  validateCanonicalConfiguration,
  validateEnvironment,
  validateRepositoryConfig,
} from './validate-keycloak-config.mjs';

function expectFailure(name, operation) {
  try {
    operation();
  } catch {
    return;
  }
  throw new Error(`Unsafe Keycloak fixture unexpectedly passed: ${name}`);
}

validateRepositoryConfig();
const environments = loadEnvironmentExamples();

expectFailure('wildcard deployed redirect', () =>
  validateEnvironment(
    { ...environments.deployed, PORTAL_BFF_CALLBACK_URI: 'https://portal.example.invalid/*' },
    'deployed',
    'Unsafe fixture',
  ),
);

expectFailure('HTTP deployed origin', () =>
  validateEnvironment(
    { ...environments.deployed, ADMIN_BFF_ORIGIN: 'http://admin.example.invalid' },
    'deployed',
    'Unsafe fixture',
  ),
);

expectFailure('unresolved placeholder', () =>
  validateEnvironment(
    { ...environments.local, PORTAL_BFF_CLIENT_SECRET: '${PORTAL_BFF_CLIENT_SECRET}' },
    'local',
    'Unsafe fixture',
  ),
);

expectFailure('test identity in deployed configuration', () =>
  validateEnvironment(
    { ...environments.deployed, KEYCLOAK_TEST_ADMIN_USERNAME: 'unsafe-test-user' },
    'deployed',
    'Unsafe fixture',
  ),
);

expectFailure('partial Google credentials', () =>
  validateEnvironment(
    { ...environments.local, GOOGLE_OAUTH_CLIENT_ID: 'local-google-client' },
    'local',
    'Unsafe fixture',
  ),
);

const unsafeCanonicalConfiguration = {
  realm: {
    name: 'smart-business',
    displayName: 'Smart Business',
    defaultLocale: 'en',
    supportedLocales: ['en', 'es'],
    registrationAllowed: false,
    resetPasswordAllowed: false,
    rememberMe: false,
  },
  roles: ['platform_admin', 'support_agent'],
  clients: [
    {
      clientId: 'portal-bff',
      callbackPath: '/api/auth/callback/portal-bff',
      standardFlowEnabled: true,
      implicitFlowEnabled: false,
      directAccessGrantsEnabled: true,
      serviceAccountsEnabled: false,
      publicClient: false,
      bearerOnly: false,
    },
    {
      clientId: 'admin-bff',
      callbackPath: '/api/auth/callback/admin-bff',
      standardFlowEnabled: true,
      implicitFlowEnabled: false,
      directAccessGrantsEnabled: false,
      serviceAccountsEnabled: false,
      publicClient: false,
      bearerOnly: false,
    },
  ],
  identityProviders: [
    {
      alias: 'google',
      providerId: 'google',
      enabledWhenConfigured: true,
      linkOnly: false,
      trustEmail: true,
      storeToken: false,
      syncMode: 'IMPORT',
      scopes: ['openid', 'profile', 'email'],
    },
  ],
  passkeys: {
    browserFlowAlias: 'smart-business-browser',
    requiredActionAlias: 'webauthn-register-passwordless',
    rpEntityName: 'Smart Business',
    signatureAlgorithms: ['ES256', 'RS256'],
    attestationConveyancePreference: 'none',
    residentKey: 'required',
    userVerificationRequirement: 'required',
    avoidSameAuthenticatorRegistration: true,
  },
  securityEvents: {
    eventsEnabled: true,
    eventsExpirationSeconds: 172800,
    enabledEventTypes: [
      'CLIENT_LOGIN_ERROR',
      'CODE_TO_TOKEN_ERROR',
      'EXECUTE_ACTIONS_ERROR',
      'FEDERATED_IDENTITY_LINK_ERROR',
      'IDENTITY_PROVIDER_FIRST_LOGIN_ERROR',
      'IDENTITY_PROVIDER_POST_LOGIN_ERROR',
      'LOGIN_ERROR',
      'LOGOUT_ERROR',
      'REMOVE_CREDENTIAL_ERROR',
      'REMOVE_FEDERATED_IDENTITY_ERROR',
      'UPDATE_CREDENTIAL_ERROR',
    ],
    eventListeners: [],
    adminEventsEnabled: true,
    adminEventsDetailsEnabled: false,
  },
  eventMetrics: {
    enabled: true,
    events: [
      'code_to_token',
      'identity_provider_first_login',
      'identity_provider_login',
      'identity_provider_post_login',
      'identity_provider_response',
      'login',
      'logout',
      'refresh_token',
      'remove_credential',
      'update_credential',
      'user_session_deleted',
    ],
    tags: ['realm', 'clientId', 'idp'],
  },
};
expectFailure('direct-access grant', () =>
  validateCanonicalConfiguration(unsafeCanonicalConfiguration),
);

expectFailure('passkey verification weakened', () =>
  validateCanonicalConfiguration({
    ...unsafeCanonicalConfiguration,
    passkeys: {
      ...unsafeCanonicalConfiguration.passkeys,
      userVerificationRequirement: 'preferred',
    },
  }),
);

expectFailure('passkey attestation enabled', () =>
  validateCanonicalConfiguration({
    ...unsafeCanonicalConfiguration,
    passkeys: {
      ...unsafeCanonicalConfiguration.passkeys,
      attestationConveyancePreference: 'direct',
    },
  }),
);

expectFailure('passkey discoverable credentials weakened', () =>
  validateCanonicalConfiguration({
    ...unsafeCanonicalConfiguration,
    passkeys: { ...unsafeCanonicalConfiguration.passkeys, residentKey: 'preferred' },
  }),
);

expectFailure('security events logged with personal data', () =>
  validateCanonicalConfiguration({
    ...unsafeCanonicalConfiguration,
    securityEvents: {
      ...unsafeCanonicalConfiguration.securityEvents,
      eventListeners: ['jboss-logging'],
    },
  }),
);

expectFailure('identity metric cardinality expanded', () =>
  validateCanonicalConfiguration({
    ...unsafeCanonicalConfiguration,
    eventMetrics: {
      ...unsafeCanonicalConfiguration.eventMetrics,
      tags: [...unsafeCanonicalConfiguration.eventMetrics.tags, 'userId'],
    },
  }),
);

console.log('Unsafe Keycloak configuration fixtures were rejected.');

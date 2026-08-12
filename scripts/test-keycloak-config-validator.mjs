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

console.log('Unsafe Keycloak configuration fixtures were rejected.');

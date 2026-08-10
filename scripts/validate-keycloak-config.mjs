#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(import.meta.dirname, '..');
const configuration = JSON.parse(
  readFileSync(resolve(repositoryRoot, 'infra/keycloak/configuration.json'), 'utf8'),
);

export function parseEnvFile(path) {
  const values = {};
  for (const rawLine of readFileSync(path, 'utf8').split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (line === '' || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator < 1) throw new Error(`Invalid environment line in ${path}: ${rawLine}`);
    values[line.slice(0, separator)] = line.slice(separator + 1);
  }
  return values;
}

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function exactKeys(actual, expected, subject) {
  invariant(
    JSON.stringify([...actual].sort()) === JSON.stringify([...expected].sort()),
    `${subject} must contain exactly: ${expected.join(', ')}`,
  );
}

export function validateCanonicalConfiguration(candidate = configuration) {
  const realm = candidate.realm;
  invariant(realm.name === 'smart-business', 'The canonical realm name must be smart-business.');
  invariant(
    realm.displayName === 'Smart Business',
    'The global realm display name must be Smart Business.',
  );
  invariant(realm.defaultLocale === 'en', 'English must be the default Keycloak locale.');
  exactKeys(realm.supportedLocales, ['en', 'es'], 'Supported Keycloak locales');
  invariant(realm.registrationAllowed === false, 'Self-registration must remain disabled.');
  invariant(
    realm.resetPasswordAllowed === false,
    'Password recovery must remain disabled for the MVP.',
  );
  invariant(realm.rememberMe === false, 'Keycloak remember-me must remain disabled.');
  exactKeys(candidate.roles, ['platform_admin', 'support_agent'], 'Stable realm roles');

  exactKeys(
    candidate.clients.map(({ clientId }) => clientId),
    ['portal-bff', 'admin-bff'],
    'BFF clients',
  );
  for (const client of candidate.clients) {
    invariant(
      client.standardFlowEnabled === true,
      `${client.clientId} must enable Authorization Code.`,
    );
    for (const unsafeSetting of [
      'implicitFlowEnabled',
      'directAccessGrantsEnabled',
      'serviceAccountsEnabled',
      'publicClient',
      'bearerOnly',
    ]) {
      invariant(
        client[unsafeSetting] === false,
        `${client.clientId}.${unsafeSetting} must be false.`,
      );
    }
    invariant(
      client.callbackPath === `/api/auth/callback/${client.clientId}`,
      `${client.clientId} must use its exact backend callback path.`,
    );
  }

  exactKeys(
    candidate.identityProviders.map(({ alias }) => alias),
    ['google'],
    'Identity providers',
  );
  const [google] = candidate.identityProviders;
  invariant(google.providerId === 'google', 'Google must use the Keycloak Google provider.');
  invariant(
    google.enabledWhenConfigured === true,
    'Google must only be enabled when both OAuth credentials are configured.',
  );
  invariant(google.linkOnly === false, 'Google must be available on the login page.');
  invariant(
    google.trustEmail === true,
    'Google email claims must be trusted after provider verification.',
  );
  invariant(google.storeToken === false, 'Google access tokens must not be stored in Keycloak.');
  invariant(google.syncMode === 'IMPORT', 'Google identities must use import synchronization.');
  exactKeys(google.scopes, ['openid', 'profile', 'email'], 'Google identity scopes');
}

const unsafeValue = /(\$\{|\{\{|<[^>]+>|\*|\b(?:CHANGE_ME|REPLACE_ME|TODO)\b)/iu;

function validateUrl(value, variable, profile) {
  invariant(!unsafeValue.test(value), `${variable} contains a placeholder or wildcard.`);
  invariant(!/[\\\u0000-\u001f\u007f]/u.test(value), `${variable} contains an unsafe character.`);
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${variable} must be an absolute URL.`);
  }
  invariant(
    url.username === '' && url.password === '',
    `${variable} must not contain credentials.`,
  );
  invariant(
    url.search === '' && url.hash === '',
    `${variable} must not contain a query or fragment.`,
  );
  if (profile === 'deployed') {
    invariant(url.protocol === 'https:', `${variable} must use HTTPS in deployed environments.`);
  } else {
    invariant(
      url.hostname === 'localhost' || url.hostname.endsWith('.localhost'),
      `${variable} must use a localhost host in ${profile}.`,
    );
  }
  return url;
}

export function validateEnvironment(values, expectedProfile, label) {
  invariant(
    values.KEYCLOAK_CONFIGURATION_PROFILE === expectedProfile,
    `${label} must select the ${expectedProfile} profile.`,
  );

  const required = [
    'KEYCLOAK_PUBLIC_URL',
    'KEYCLOAK_NETWORK_ALIAS',
    'OIDC_ISSUER_URI',
    'KEYCLOAK_ADMIN_PASSWORD',
    'PORTAL_BFF_CLIENT_SECRET',
    'PORTAL_BFF_ORIGIN',
    'PORTAL_BFF_CALLBACK_URI',
    'PORTAL_BFF_POST_LOGOUT_URI',
    'ADMIN_BFF_CLIENT_SECRET',
    'ADMIN_BFF_ORIGIN',
    'ADMIN_BFF_CALLBACK_URI',
    'ADMIN_BFF_POST_LOGOUT_URI',
  ];
  for (const variable of required) {
    invariant(values[variable]?.trim(), `${label} is missing ${variable}.`);
    invariant(
      !unsafeValue.test(values[variable]),
      `${label} ${variable} contains a placeholder or wildcard.`,
    );
  }
  invariant(
    new Set([
      values.KEYCLOAK_ADMIN_PASSWORD,
      values.PORTAL_BFF_CLIENT_SECRET,
      values.ADMIN_BFF_CLIENT_SECRET,
    ]).size === 3,
    `${label} must use distinct Keycloak credentials.`,
  );

  const keycloakUrl = validateUrl(
    values.KEYCLOAK_PUBLIC_URL,
    'KEYCLOAK_PUBLIC_URL',
    expectedProfile,
  );
  invariant(keycloakUrl.pathname === '/', `${label} KEYCLOAK_PUBLIC_URL must be an origin.`);
  if (expectedProfile === 'local' && keycloakUrl.hostname === 'localhost') {
    invariant(
      values.KEYCLOAK_NETWORK_ALIAS === 'auth.localhost',
      `${label} KEYCLOAK_NETWORK_ALIAS must retain the internal auth.localhost alias.`,
    );
  } else {
    invariant(
      values.KEYCLOAK_NETWORK_ALIAS === keycloakUrl.hostname,
      `${label} KEYCLOAK_NETWORK_ALIAS must match the public Keycloak hostname.`,
    );
  }
  const issuerUrl = validateUrl(values.OIDC_ISSUER_URI, 'OIDC_ISSUER_URI', expectedProfile);
  invariant(
    issuerUrl.origin === keycloakUrl.origin && issuerUrl.pathname === '/realms/smart-business',
    `${label} OIDC_ISSUER_URI must identify the smart-business realm on the public Keycloak origin.`,
  );

  for (const client of configuration.clients) {
    const prefix = client.clientId === 'portal-bff' ? 'PORTAL_BFF' : 'ADMIN_BFF';
    const originValue = values[`${prefix}_ORIGIN`];
    const callbackValue = values[`${prefix}_CALLBACK_URI`];
    const logoutValue = values[`${prefix}_POST_LOGOUT_URI`];
    const origin = validateUrl(originValue, `${prefix}_ORIGIN`, expectedProfile);
    const callback = validateUrl(callbackValue, `${prefix}_CALLBACK_URI`, expectedProfile);
    const logout = validateUrl(logoutValue, `${prefix}_POST_LOGOUT_URI`, expectedProfile);

    invariant(origin.pathname === '/', `${label} ${prefix}_ORIGIN must be an origin.`);
    invariant(
      callback.origin === origin.origin,
      `${label} ${prefix} callback must use its application origin.`,
    );
    invariant(
      callback.pathname === client.callbackPath,
      `${label} ${prefix} callback path is not exact.`,
    );
    invariant(
      logout.origin === origin.origin,
      `${label} ${prefix} logout must use its application origin.`,
    );
    invariant(
      logout.pathname === '/',
      `${label} ${prefix} logout destination must be the application root.`,
    );
  }

  invariant(
    new URL(values.PORTAL_BFF_ORIGIN).origin !== new URL(values.ADMIN_BFF_ORIGIN).origin,
    `${label} Portal and Admin origins must be isolated.`,
  );

  const testVariables = Object.keys(values).filter((name) => name.startsWith('KEYCLOAK_TEST_'));
  if (expectedProfile === 'test') {
    exactKeys(
      testVariables,
      [
        'KEYCLOAK_TEST_CUSTOMER_USERNAME',
        'KEYCLOAK_TEST_CUSTOMER_PASSWORD',
        'KEYCLOAK_TEST_ADMIN_USERNAME',
        'KEYCLOAK_TEST_ADMIN_PASSWORD',
      ],
      'Test identity variables',
    );
    for (const variable of testVariables) {
      invariant(values[variable]?.trim(), `${label} is missing ${variable}.`);
    }
  } else {
    invariant(testVariables.length === 0, `${label} must not contain test identity variables.`);
  }
}

export function loadEnvironmentExamples() {
  const base = parseEnvFile(resolve(repositoryRoot, 'infra/.env.example'));
  return {
    local: base,
    test: {
      ...base,
      ...parseEnvFile(resolve(repositoryRoot, 'infra/keycloak/environments/test.env.example')),
    },
    deployed: {
      ...base,
      ...parseEnvFile(resolve(repositoryRoot, 'infra/keycloak/environments/deployed.env.example')),
    },
  };
}

export function validateRepositoryConfig() {
  validateCanonicalConfiguration();
  const environments = loadEnvironmentExamples();
  validateEnvironment(environments.local, 'local', 'Local Keycloak configuration');
  validateEnvironment(environments.test, 'test', 'Test Keycloak configuration');
  validateEnvironment(environments.deployed, 'deployed', 'Deployed Keycloak example');
}

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  validateRepositoryConfig();
  console.log('Keycloak canonical, local, test, and deployed configuration is safe.');
}

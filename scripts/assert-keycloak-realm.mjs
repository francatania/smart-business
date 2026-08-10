#!/usr/bin/env node

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

const baseUrl = process.env.KEYCLOAK_ASSERT_URL;
const adminUser = process.env.KEYCLOAK_ADMIN_USER;
const adminPassword = process.env.KEYCLOAK_ADMIN_PASSWORD;
invariant(
  baseUrl && adminUser && adminPassword,
  'Keycloak assertion connection variables are required.',
);

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  if (!response.ok) throw new Error(`Keycloak request failed for ${path}: ${response.status}`);
  return response.json();
}

const tokenResponse = await request('/realms/master/protocol/openid-connect/token', {
  method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'password',
    client_id: 'admin-cli',
    username: adminUser,
    password: adminPassword,
  }),
});
const authorization = { authorization: `Bearer ${tokenResponse.access_token}` };
const adminRequest = (path) =>
  request(`/admin/realms/smart-business${path}`, { headers: authorization });

const realm = await request('/admin/realms/smart-business', { headers: authorization });
invariant(realm.displayName === 'Smart Business', 'Unexpected realm display name.');
invariant(realm.internationalizationEnabled === true, 'Realm localization is disabled.');
invariant(realm.defaultLocale === 'en', 'English is not the default realm locale.');
invariant(
  JSON.stringify([...realm.supportedLocales].sort()) === JSON.stringify(['en', 'es']),
  'Realm locales must be exactly English and Spanish.',
);
invariant(realm.registrationAllowed === false, 'Self-registration is unexpectedly enabled.');
invariant(realm.resetPasswordAllowed === false, 'Password recovery is unexpectedly enabled.');

const discovery = await request('/realms/smart-business/.well-known/openid-configuration');
invariant(
  discovery.issuer === `${process.env.KEYCLOAK_PUBLIC_URL}/realms/smart-business`,
  'The OIDC issuer does not use the configured public Keycloak origin.',
);

for (const roleName of ['platform_admin', 'support_agent']) {
  const role = await adminRequest(`/roles/${roleName}`);
  invariant(role.name === roleName, `Missing stable realm role ${roleName}.`);
}

const expectedClients = [
  {
    clientId: 'portal-bff',
    secret: process.env.PORTAL_BFF_CLIENT_SECRET,
    origin: process.env.PORTAL_BFF_ORIGIN,
    callback: process.env.PORTAL_BFF_CALLBACK_URI,
    logout: process.env.PORTAL_BFF_POST_LOGOUT_URI,
  },
  {
    clientId: 'admin-bff',
    secret: process.env.ADMIN_BFF_CLIENT_SECRET,
    origin: process.env.ADMIN_BFF_ORIGIN,
    callback: process.env.ADMIN_BFF_CALLBACK_URI,
    logout: process.env.ADMIN_BFF_POST_LOGOUT_URI,
  },
];

for (const expected of expectedClients) {
  const clients = await adminRequest(`/clients?clientId=${encodeURIComponent(expected.clientId)}`);
  invariant(clients.length === 1, `Expected exactly one ${expected.clientId} client.`);
  const client = await adminRequest(`/clients/${clients[0].id}`);
  invariant(
    client.clientId === expected.clientId,
    `Unexpected client ID for ${expected.clientId}.`,
  );
  invariant(client.publicClient === false, `${expected.clientId} must be confidential.`);
  invariant(client.bearerOnly === false, `${expected.clientId} must not be bearer-only.`);
  invariant(
    client.standardFlowEnabled === true,
    `${expected.clientId} must enable Authorization Code.`,
  );
  invariant(
    client.implicitFlowEnabled === false,
    `${expected.clientId} enables the implicit flow.`,
  );
  invariant(
    client.directAccessGrantsEnabled === false,
    `${expected.clientId} enables direct grants.`,
  );
  invariant(
    client.serviceAccountsEnabled === false,
    `${expected.clientId} enables service accounts.`,
  );
  invariant(client.fullScopeAllowed === false, `${expected.clientId} grants every realm scope.`);
  invariant(
    JSON.stringify(client.redirectUris) === JSON.stringify([expected.callback]),
    `${expected.clientId} redirect URIs are not exact.`,
  );
  invariant(
    JSON.stringify(client.webOrigins) === JSON.stringify([expected.origin]),
    `${expected.clientId} web origins are not exact.`,
  );
  invariant(
    client.attributes['post.logout.redirect.uris'] === expected.logout,
    `${expected.clientId} post-logout URI is not exact.`,
  );
  invariant(
    client.attributes['pkce.code.challenge.method'] === 'S256',
    `${expected.clientId} does not require S256 PKCE.`,
  );
  invariant(
    client.attributes['oauth2.device.authorization.grant.enabled'] === 'false',
    `${expected.clientId} enables the device grant.`,
  );
  invariant(
    client.attributes['oidc.ciba.grant.enabled'] === 'false',
    `${expected.clientId} enables the CIBA grant.`,
  );
  const secret = await adminRequest(`/clients/${clients[0].id}/client-secret`);
  invariant(secret.value === expected.secret, `${expected.clientId} secret was not reconciled.`);
}

const identityProviders = await adminRequest('/identity-provider/instances');
const google = identityProviders.find(({ alias }) => alias === 'google');
if (process.env.KEYCLOAK_EXPECT_GOOGLE === 'true') {
  invariant(google, 'Google identity provider is missing.');
  invariant(google.providerId === 'google', 'Google uses an unexpected Keycloak provider.');
  invariant(google.enabled === true, 'Google identity provider is disabled.');
  invariant(google.linkOnly === false, 'Google identity provider is link-only.');
  invariant(google.trustEmail === true, 'Google identity provider does not trust verified email.');
  invariant(google.storeToken === false, 'Google access tokens must not be stored.');
  invariant(google.config.syncMode === 'IMPORT', 'Google synchronization mode is unexpected.');
  invariant(google.config.defaultScope === 'openid profile email', 'Google scopes are unexpected.');
  invariant(
    google.config.clientId === process.env.GOOGLE_OAUTH_CLIENT_ID,
    'Google client ID differs from the configured value.',
  );
  invariant(google.config.clientSecret, 'Google client secret is missing.');
} else {
  invariant(!google, 'Google identity provider must remain absent without credentials.');
}

if (process.env.KEYCLOAK_EXPECT_TEST_USERS === 'true') {
  for (const variable of ['KEYCLOAK_TEST_CUSTOMER_USERNAME', 'KEYCLOAK_TEST_ADMIN_USERNAME']) {
    const username = process.env[variable];
    const users = await adminRequest(`/users?exact=true&username=${encodeURIComponent(username)}`);
    invariant(
      users.length === 1 && users[0].username === username,
      `Missing test identity ${variable}.`,
    );
    if (variable === 'KEYCLOAK_TEST_ADMIN_USERNAME') {
      const roles = await adminRequest(`/users/${users[0].id}/role-mappings/realm`);
      invariant(
        roles.some(({ name }) => name === 'platform_admin'),
        'Test admin lacks platform_admin.',
      );
    }
  }
}

console.log('The live Keycloak realm matches the expected secure configuration.');

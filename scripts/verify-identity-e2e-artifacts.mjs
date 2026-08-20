#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const repositoryRoot = resolve(import.meta.dirname, '..');
const artifactPaths = process.argv.slice(2).map((path) => resolve(repositoryRoot, path));
const secretNames = [
  'KEYCLOAK_TEST_CUSTOMER_USERNAME',
  'KEYCLOAK_TEST_CUSTOMER_PASSWORD',
  'KEYCLOAK_TEST_ADMIN_USERNAME',
  'KEYCLOAK_TEST_ADMIN_PASSWORD',
  'PORTAL_BFF_CLIENT_SECRET',
  'ADMIN_BFF_CLIENT_SECRET',
];
const secretValues = secretNames.map((name) => process.env[name]).filter(Boolean);
const sensitivePatterns = [
  /(?:access|refresh|id)[_-]?token\s*[:=]/i,
  /(?:SBSESSION|__Host-SBSESSION)=/,
  /eyJ[a-zA-Z0-9_-]{12,}\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/,
];

function filesIn(path) {
  if (!existsSync(path)) return [];
  if (statSync(path).isFile()) return [path];
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) =>
    filesIn(join(path, entry.name)),
  );
}

const failures = [];
for (const path of artifactPaths.flatMap(filesIn)) {
  const contents = readFileSync(path, 'utf8');
  const matchedSecret = secretValues.find((value) => contents.includes(value));
  const matchedPattern = sensitivePatterns.find((pattern) => pattern.test(contents));
  if (matchedSecret || matchedPattern) {
    failures.push(
      `${path}: ${matchedSecret ? 'configured identity or secret value' : matchedPattern}`,
    );
  }
}

if (failures.length > 0) {
  throw new Error(`Sensitive identity E2E data found in artifacts:\n${failures.join('\n')}`);
}

console.log(
  'Identity E2E artifacts contain no configured identities, secrets, tokens, or session cookies.',
);

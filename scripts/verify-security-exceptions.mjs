import { readFile } from 'node:fs/promises';

const policy = JSON.parse(
  await readFile(new URL('../security/dependency-exceptions.json', import.meta.url), 'utf8'),
);
const today = new Date();

for (const exception of policy.exceptions) {
  const requiredFields = ['id', 'package', 'reason', 'owner', 'expires', 'trackingIssue'];
  for (const field of requiredFields) {
    if (typeof exception[field] !== 'string' || exception[field].trim() === '') {
      throw new Error(`Security exception is missing a non-empty ${field}.`);
    }
  }
  const expiry = new Date(`${exception.expires}T23:59:59Z`);
  if (Number.isNaN(expiry.valueOf()) || expiry < today) {
    throw new Error(`Security exception ${exception.id} is expired or has an invalid expiry date.`);
  }
}

const ignoredAdvisories = (await readFile(new URL('../.trivyignore', import.meta.url), 'utf8'))
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line !== '' && !line.startsWith('#'))
  .sort();
const activeExceptions = policy.exceptions.map((exception) => exception.id).sort();

if (JSON.stringify(ignoredAdvisories) !== JSON.stringify(activeExceptions)) {
  throw new Error(
    'Every Trivy ignore must match exactly one active documented security exception.',
  );
}

console.log(`Validated ${policy.exceptions.length} active security exception(s).`);

import { writeFile } from 'node:fs/promises';
import prettier from 'prettier';

const sourceUrl = process.env.OPENAPI_SOURCE_URL ?? 'http://localhost:8080/v3/api-docs';
const target = new URL('./smart-business.json', import.meta.url);

const response = await fetch(sourceUrl);
if (!response.ok) {
  throw new Error(`OpenAPI export failed with HTTP ${response.status} from ${sourceUrl}`);
}

const runtimeContract = await response.json();
const relativePaths = Object.fromEntries(
  Object.entries(runtimeContract.paths ?? {}).map(([path, operation]) => [
    path.replace(/^\/api(?=\/)/, ''),
    operation,
  ]),
);
const canonicalContract = sortObject({
  ...runtimeContract,
  info: {
    ...runtimeContract.info,
    title: 'Smart Business API',
    version: '0.1.0',
  },
  servers: [{ url: '/api' }],
  paths: relativePaths,
});

const formattedContract = await prettier.format(JSON.stringify(canonicalContract), {
  parser: 'json',
});
await writeFile(target, formattedContract, 'utf8');

function sortObject(value) {
  if (Array.isArray(value)) {
    return value.map(sortObject);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, sortObject(child)]),
    );
  }
  return value;
}

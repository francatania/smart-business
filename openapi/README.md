# OpenAPI contract

The backend exposes its runtime contract through Springdoc. `export-contract.mjs`
normalizes it to the same-origin `/api` base path and writes the committed,
deterministically sorted contract. Generated clients must be reproducible from
this source.

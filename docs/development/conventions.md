# Development Conventions

Environment variables and secret ownership are defined in [Configuration and Secret Handling](./configuration.md).

## Language

Repository documentation, source code, domain names, commit messages, and GitHub issues are written in English. User-facing translations belong to application localization resources.

## Domain language

Use business-agnostic terms such as `organization`, `location`, `professional`, `service`, `appointment`, `customer relationship`, and `service record`. Vertical-specific labels belong in presentation configuration rather than core type names.

## Toolchains

Use the versions declared at the repository root. Maven builds run through `backend/mvnw`; JavaScript builds run through the pinned pnpm version and the committed lockfile.

## Changes

- Keep each change focused on one primary issue.
- Add or update automated tests with behavior changes.
- Update documentation when an accepted product or architecture decision changes.
- Never commit real credentials, local environment files, customer data, or generated media.
- Treat generated API artifacts as reproducible outputs and verify them in CI.

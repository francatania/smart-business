# Development Conventions

Environment variables and secret ownership are defined in [Configuration and Secret Handling](./configuration.md).

## Language

Repository documentation, source code, domain names, commit messages, and GitHub issues are written in English. User-facing translations belong to application localization resources.

## Domain language

Use business-agnostic terms such as `organization`, `location`, `professional`, `service`, `appointment`, `customer relationship`, and `service record`. Vertical-specific labels belong in presentation configuration rather than core type names.

## Backend module structure

- Organize backend code first by business module, never in global technical-layer packages.
- Use `<module>.api` only for deliberate contracts that other Spring Modulith modules may import. Keep every other package internal to its owning module.
- Add internal subpackages only when a module has enough responsibility to justify them. Prefer specific names such as `application`, `persistence`, `configuration`, `authorization`, `authentication`, or `session`.
- Do not create generic global packages such as `controllers`, `services`, `repositories`, or `models`.
- Keep JPA entities, repositories, and persistence converters in the `persistence` package of their owning module. Other modules must use the module API or published events instead of its persistence types.
- A cohesive area may combine HTTP controllers and supporting services when they belong to the same flow; for example, `identity.session`.
- Java visibility may be widened when sibling internal packages need to collaborate. Spring Modulith's closed module boundary still prevents other modules from depending on those implementation types.

## Toolchains

Use the versions declared at the repository root. Maven builds run through `backend/mvnw`; JavaScript builds run through the pinned pnpm version and the committed lockfile.

## Changes

- Keep each change focused on one primary issue.
- Add or update automated tests with behavior changes.
- Update documentation when an accepted product or architecture decision changes.
- Never commit real credentials, local environment files, customer data, or generated media.
- Treat generated API artifacts as reproducible outputs and verify them in CI.

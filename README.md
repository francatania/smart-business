# Smart Business

Smart Business is a business-agnostic platform for appointment-based personal care businesses. It combines scheduling, organization-owned customer service records, secure media, and future AI-assisted consultation.

The product currently targets barbershops while keeping domain language suitable for other verticals.

## Repository layout

```text
backend/                    Spring Boot modular monolith
frontend/apps/portal/       Customer and professional PWA
frontend/apps/admin/        Business administration application
frontend/packages/          Shared TypeScript packages
frontend/e2e/               Cross-application Playwright tests
infra/                      Local Docker Compose infrastructure
openapi/                    Generated API contract
docs/                       Product, architecture, and development documentation
```

## Toolchain

- Java 25
- Maven 3.9.16 through the Maven Wrapper
- Node.js 24.18.1 LTS
- pnpm 10.34.0 through Corepack
- Docker with Docker Compose

Run `make help` to discover the repository-level commands. The complete onboarding guide is added as the platform foundation is implemented.

## Documentation

Product and architecture decisions live in [docs](./docs/README.md). Repository documentation, source code, domain names, and GitHub issues are written in English.

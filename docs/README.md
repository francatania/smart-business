# Product Documentation

This directory contains the current product definition for Smart Business. It is the source of truth for product decisions that will later be translated into GitHub issues and implementation work.

The product is initially focused on barbershops, but its domain model and core terminology must support other appointment-based personal care businesses, such as nail salons.

## Documents

- [Product Definition](./product-definition.md): vision, users, product surfaces, scope, and product principles.
- [Domain and Data Ownership](./domain-and-data.md): generic domain language, tenant boundaries, record visibility, and access rules.
- [User Flows](./user-flows.md): customer booking, customer access, professional service records, AI-assisted previews, and business administration.
- [Authentication and Access](./authentication-and-access.md): Keycloak, account creation, identity providers, passkeys, BFF sessions, roles, and account linking.
- [Technical Architecture](./technical-architecture.md): selected stack, modular monolith boundaries, persistence, media storage, frontend structure, local infrastructure, and scaling strategy.
- [Configuration and Secret Handling](./development/configuration.md): profiles, environment variables, public frontend configuration, local overrides, and credential rotation.
- [Observability and Audit Conventions](./development/observability.md): correlation, structured logs, management endpoints, operational metrics, and future audit-event rules.
- [Automated Testing](./development/testing.md): backend test layers, PostgreSQL integration tests, frontend component tests, browser smoke tests, and fixture conventions.

## Presentations

- [Spanish Product Definition](./presentations/product-definition-es.pdf): presentation-ready overview for Spanish-speaking stakeholders.

## Documentation Conventions

- Repository documentation, source code, domain names, and GitHub issues must be written in English.
- Internal domain terms should be business-agnostic. Vertical-specific labels may be used in the user interface.
- Confirmed choices are recorded as **Decisions**.
- Unresolved matters are recorded as **Open questions** and must not be treated as implementation requirements.
- Documents should be updated when a product discussion changes an existing decision.

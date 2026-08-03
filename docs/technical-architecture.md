# Technical Architecture

## Status

Accepted initial architecture as of August 3, 2026. Dependency versions must remain pinned and should be reviewed when implementation begins or when a planned upgrade is proposed.

## Decision Summary

| Area                               | Decision                                                                        |
| ---------------------------------- | ------------------------------------------------------------------------------- |
| Repository                         | Monorepo                                                                        |
| Backend architecture               | Modular monolith                                                                |
| Backend language                   | Java 25 LTS                                                                     |
| Backend framework                  | Spring Boot 4.1                                                                 |
| Module boundaries                  | Spring Modulith using a compatible release managed through its BOM              |
| HTTP stack                         | Spring Web MVC                                                                  |
| API style                          | REST with OpenAPI                                                               |
| Identity provider                  | Keycloak with one `smart-business` realm                                        |
| Security                           | Keycloak, Spring Security OIDC client, BFF pattern, secure server-side sessions |
| Persistence                        | PostgreSQL 18                                                                   |
| Flexible vertical data             | PostgreSQL `jsonb` used selectively                                             |
| Database migrations                | Flyway                                                                          |
| Binary media                       | Private S3-compatible object storage                                            |
| Customer and professional frontend | One role-aware React PWA                                                        |
| Business administration frontend   | Separate React web application                                                  |
| Frontend language and tooling      | TypeScript, React, and Vite                                                     |
| Local infrastructure               | Docker Compose                                                                  |
| CI/CD                              | GitHub Actions                                                                  |

## Context

The product is an early-stage B2B SaaS with tightly connected transactional workflows: organizations configure services and availability, customers create appointments, professionals complete service records, and media and AI analyses are attached to those records.

The domain is still evolving and the initial engineering team is expected to be small. Operational simplicity, transactional consistency, and rapid iteration are more valuable at this stage than independently deployable services.

## High-Level Architecture

```text
┌────────────────────────────┐     ┌────────────────────────────┐
│ Customer/Professional PWA  │     │ Business Administration    │
│ React + TypeScript + Vite  │     │ React + TypeScript + Vite  │
└──────────────┬─────────────┘     └──────────────┬─────────────┘
               │                                  │
               └────────────────┬─────────────────┘
                                │ HTTPS / REST + session cookie
                                ▼
                 ┌───────────────────────────────┐
                 │ Spring Boot Modular Monolith  │
                 │                               │
                 │ Identity and Access           │
                 │ Organizations                 │
                 │ Scheduling                    │
                 │ Customers                     │
                 │ Service Records               │
                 │ Media                         │
                 │ Notifications                 │
                 │ AI Orchestration              │
                 │ Reporting                     │
                 └───────┬───────────┬───────────┘
                         │           │
          ┌──────────────┘           └──────────────┐
          │ application data              media    │ OIDC
          ▼                                         ▼
   ┌─────────────┐     ┌───────────────────┐  ┌─────────────────┐
   │ PostgreSQL  │     │ S3-compatible     │  │ Keycloak        │
   │ application │     │ private object    │  │ Google broker   │
   │ database    │     │ storage           │  │ Passkeys / MFA  │
   └─────────────┘     └───────────────────┘  └────────┬────────┘
                                                      │ identity data
                                                      ▼
                                             ┌─────────────────┐
                                             │ PostgreSQL      │
                                             │ Keycloak DB     │
                                             └─────────────────┘
```

The container boundary and the domain-module boundary are deliberately different. The backend is one deployable application containing several enforced functional modules.

## Backend Architecture

### Modular monolith

The backend starts as one Spring Boot application and one primary PostgreSQL database. It must still be structured by business capability rather than by technical layer.

Initial application modules:

```text
com.smartbusiness
├── identity
├── organization
├── scheduling
├── customer
├── servicerecord
├── media
├── notification
├── ai
└── reporting
```

Each module owns:

- Its domain model.
- Its persistence mappings and repositories.
- Its application services.
- Its public internal API.
- The events it publishes or consumes.
- Its module-level integration tests.

Another module must not access its internal entities or repositories directly. Cross-module collaboration happens through an exposed module API or an application event.

Spring Modulith is used to verify module dependencies, prevent cycles, exercise module-scoped integration tests, and document the module model.

### Why microservices are not selected

Microservices would introduce distributed transactions, network failure modes, service discovery, independent deployment pipelines, cross-service observability, message infrastructure, and duplicated operational concerns before they provide measurable value.

A modular monolith can still scale horizontally by running multiple stateless application instances behind a load balancer. The initial scaling constraints are more likely to be database access, media processing, and external AI usage than the number of backend deployables.

### Extraction criteria

A module may become a separate service only when at least one of these needs is demonstrated:

- It requires materially different scaling characteristics.
- It requires specialized infrastructure such as a GPU runtime.
- Its failures must be isolated from core booking and record workflows.
- An independent team needs a separate release lifecycle.
- Its domain boundary and contract are stable enough to support independent deployment.

The first likely extraction candidate is AI or image processing. Notification delivery and analytical processing are secondary candidates. Scheduling, customer relationships, and service records should remain together until there is strong evidence to separate them.

## Backend Stack

### Runtime and framework

- Java 25 LTS.
- Spring Boot 4.1.
- Maven for dependency management and builds.
- Spring Web MVC rather than a reactive HTTP stack.
- Spring Modulith with its version managed through the official BOM.

Spring Web MVC is selected because the dominant workflows are transactional database operations and external API orchestration. Reactive programming is not needed for the initial scale and would add a second programming model without a demonstrated benefit.

### Spring components

- Spring Security OAuth 2.0 Client for the OIDC authorization-code flow with Keycloak.
- Spring Security for session protection, CSRF protection, and application authorization integration.
- Spring Data JPA and Hibernate for relational persistence.
- Spring Session JDBC for server-side session persistence.
- Spring Validation for request and command validation.
- Spring Boot Actuator and Micrometer for health and application metrics.
- Spring Modulith application events for decoupled module collaboration.

An external broker such as Kafka or RabbitMQ is not part of the initial stack. When reliable asynchronous handling is required, the application should first use the Spring Modulith JDBC event publication registry or a database-backed job pattern.

### API conventions

- JSON REST endpoints.
- An OpenAPI specification generated from or validated against the backend API.
- A generated TypeScript API client consumed by both frontend applications.
- Versioning introduced when compatibility requirements justify it, not as an automatic `/v1` prefix with no versioning policy.
- Problem Details-compatible error responses with stable application error codes.
- Pagination, filtering, sorting, and time-zone behavior defined consistently across endpoints.

## Persistence

### PostgreSQL as the source of truth

PostgreSQL is the only application database in the initial architecture. MongoDB is not part of the stack.

Relational tables model the information that requires constraints, joins, authorization, transactions, and frequent queries, including:

- Organizations and locations.
- Users, memberships, and customer relationships.
- Services and availability.
- Appointments.
- Service records.
- Products and techniques.
- Media metadata and permission states.
- AI analysis metadata.
- Session data.

Every organization-owned record must include or derive an organization identifier. Tenant filtering and authorization are mandatory in application services and repository access. Database row-level security may be evaluated later as defense in depth, but it is not required for the first implementation.

### JSONB policy

PostgreSQL `jsonb` may store vertical-specific attributes that are expected to evolve, for example haircut-specific measurements or nail-service-specific material details.

`jsonb` must not replace the relational model. A value should be a regular column or related table when it is:

- Used for authorization or tenant isolation.
- Required for referential integrity.
- Frequently filtered, sorted, joined, or aggregated.
- Shared by every supported vertical.
- Governed by a strict lifecycle or uniqueness constraint.

JSON structures must be versioned or validated at the application boundary. Frequently queried JSON paths require deliberate indexes.

### Migrations

Flyway owns all schema changes. Hibernate automatic schema creation or mutation must not be enabled in shared or production environments.

Migration files are immutable after they have been applied to a shared environment. Corrective changes are introduced through new migrations.

## Media Storage

### Storage decision

Image bytes are stored in a private S3-compatible object store, not in PostgreSQL or MongoDB. PostgreSQL stores the metadata and relationships needed by the domain.

A media record should include at least:

- Identifier.
- Owning organization.
- Customer relationship.
- Related appointment or service record.
- Object storage key.
- Content type and byte size.
- Checksum.
- Source and purpose.
- Visibility.
- AI-processing permission state.
- Marketing permission state.
- Creator and timestamps.

### Upload flow

```text
PWA                         Backend                      Object storage
 │                             │                               │
 │ Request upload permission   │                               │
 ├────────────────────────────>│ Validate tenant and context   │
 │                             │ Create pending media record   │
 │ Receive signed upload URL   │                               │
 │<────────────────────────────┤                               │
 │ Upload image directly       │                               │
 ├────────────────────────────────────────────────────────────>│
 │ Confirm upload              │                               │
 ├────────────────────────────>│ Verify object and finalize    │
 │                             │ metadata                      │
```

Buckets remain private. Reads use short-lived signed URLs or an authorized backend delivery path. Permanent public object URLs must not be used for customer media.

Media validation should eventually cover file size, detected content type, image dimensions, checksums, malicious content scanning, and metadata removal where appropriate.

## Authentication and Sessions

### Keycloak responsibility

Keycloak is the identity provider and authorization server. It owns:

- User credentials and authentication flows.
- Google identity brokering.
- Passkey registration and authentication through WebAuthn.
- Multi-factor authentication and recovery mechanisms when configured.
- Identity-provider account linking.
- Identity-provider sessions and token issuance, refresh, and revocation.

Keycloak uses one realm named `smart-business`. A realm must not be created per customer organization because a platform user can be a customer or professional in multiple organizations.

Initial OIDC clients represent Smart Business applications rather than tenant organizations:

```text
smart-business realm
├── portal-bff
├── admin-bff
└── future service clients
```

Google is configured as an identity provider inside Keycloak. Passkeys are configured using the realm's WebAuthn passwordless policy. Spring Boot does not implement or persist WebAuthn credentials directly.

### Backend-for-frontend pattern

Spring Boot acts as an OIDC confidential client and backend for frontend. Browser applications do not manage Keycloak access or refresh tokens.

```text
Browser                 Spring Boot                         Keycloak
   │                         │                                  │
   │ Start sign-in           │                                  │
   ├────────────────────────>│ Redirect to authorization       │
   │                         ├─────────────────────────────────>│
   │                         │ Google/passkey authentication   │
   │                         │<─────────────────────────────────┤
   │                         │ Exchange authorization code     │
   │                         ├─────────────────────────────────>│
   │ HTTP-only session cookie│ Receive tokens server-side      │
   │<────────────────────────┤                                  │
```

The browser sends a secure, HTTP-only session cookie to Spring Boot. Keycloak tokens stay on the server side and must not be stored in `localStorage`, IndexedDB, or another browser persistence mechanism.

Spring Session JDBC is the initial shared application-session store so that multiple backend instances can serve the same authenticated users. Redis may replace it only if measured load or latency justifies another infrastructure component.

Application sign-out must invalidate the Spring session and complete the appropriate Keycloak logout flow.

### Local identity mapping

PostgreSQL retains a Smart Business user record. The external identity key is the combination of the Keycloak issuer and the stable `sub` claim, not an email address.

```text
external_identity
├── user_id
├── issuer
├── subject
└── timestamps
```

On first authenticated access, the identity module finds or creates the local user. Creating a local user does not automatically create a customer relationship or organization membership; those remain explicit domain operations.

### Roles and authorization

Keycloak roles are limited to stable, platform-wide access such as `platform_admin` or a future `support_agent` role.

Organization roles remain in PostgreSQL:

- Owner.
- Administrator.
- Receptionist.
- Professional.

The backend evaluates organization membership, location assignment, customer relationship, appointment assignment, record visibility, and media permissions on every protected operation. Authentication by Keycloak or possession of a valid application session does not grant access to an organization's data.

Keycloak Organizations is not the source of truth for Smart Business organizations or memberships in the initial architecture. It may be evaluated later for enterprise SSO, invitations, or identity-first login. If adopted, ownership and synchronization rules must be defined before implementation.

Email magic links or one-time codes remain part of the product authentication plan. Whether they are implemented through a supported Keycloak flow, a custom Keycloak authenticator, or a different verified mechanism remains open.

## Frontend Architecture

### Repository structure

```text
frontend
├── apps
│   ├── portal
│   │   └── Customer and professional PWA
│   └── admin
│       └── Business administration web application
└── packages
    ├── api-client
    ├── auth
    ├── ui
    └── shared-types
```

The frontend workspace uses `pnpm` workspaces. A larger monorepo orchestrator such as Nx or Turborepo is not required initially.

### Shared frontend stack

- React.
- TypeScript with strict type checking.
- Vite.
- React Router.
- TanStack Query for server state.
- React Hook Form for form state.
- Zod for client-side schema validation where it improves the user experience.
- A generated TypeScript client based on OpenAPI.
- Vitest and React Testing Library.
- Playwright for end-to-end tests.

The UI component and styling system is not yet selected. It must support accessible mobile workflows and information-dense administration screens without forcing the two applications to have identical layouts.

### Role-aware portal PWA

Customers and professionals use one deployed PWA. Routes and navigation are driven by authenticated capabilities:

- Customers access their appointments and customer-visible service information.
- Professionals access their schedule, authorized customer context, media capture, and service-record workflows.
- A user with both relationships can switch context without creating a second platform identity.

The PWA must work as a regular website before installation. Offline support is limited to deliberately designed read or draft scenarios; the presence of a service worker must not imply that every workflow works offline.

### Administration application

The administration frontend is a separate application because its navigation, screen density, roles, and device usage differ from the customer and professional portal.

Server-side rendering is not required for either application initially. A separate public marketing website may use static generation or server rendering if search-engine discoverability becomes important.

## Docker Compose

Docker Compose defines the reproducible local infrastructure.

The default development stack should contain:

```text
postgres
keycloak
object-storage
mailpit
```

Application containers may be enabled through Compose profiles:

```text
backend
portal
admin
```

This allows developers to run Java and frontend development servers directly on the host for fast feedback while still supporting a complete containerized stack for onboarding and CI scenarios.

Compose requirements:

- Named volumes for persistent local data.
- Health checks for infrastructure dependencies.
- No committed secrets.
- An `.env.example` with safe development defaults.
- A documented reset process that names the exact local volumes affected.
- Optional services enabled through profiles rather than required by every developer.

The specific local S3-compatible implementation remains to be selected during scaffolding.

Keycloak uses a database and credentials separate from the application database. Local development may use one PostgreSQL server with two logical databases and two users:

```text
PostgreSQL server
├── smart_business database / application user
└── keycloak database / Keycloak user
```

Production may place these databases on separate PostgreSQL instances when availability, scaling, maintenance, or security requirements justify it. Keycloak realm, client, identity-provider, authentication-flow, and theme configuration must be reproducible and version controlled rather than depending on undocumented console changes.

Docker Compose is the local-development and single-host orchestration tool. It does not imply that production must run every stateful dependency in containers on the application host.

## Testing Strategy

### Backend

- Unit tests for domain behavior.
- Spring Modulith module integration tests.
- Architecture verification to prevent cycles and internal package access.
- Repository and migration tests against PostgreSQL through Testcontainers.
- Security tests for tenant isolation and role permissions.
- API contract tests for critical flows.

H2 or another in-memory database must not substitute for PostgreSQL in integration tests that depend on PostgreSQL behavior.

### Frontend

- Unit tests for pure behavior.
- React Testing Library for component interactions.
- Contract-compatible API mocks for isolated tests.
- Playwright for booking, authentication, professional service-record, and administration journeys.
- Mobile viewport and camera-upload fallbacks covered in end-to-end scenarios where the environment permits.

## Observability

The initial baseline includes:

- Structured application logs.
- Correlation or request identifiers.
- Spring Boot health and readiness endpoints.
- Keycloak health, readiness, login-failure, and session indicators.
- HTTP, database-pool, JVM, and application metrics.
- Audit records for security-sensitive and business-sensitive changes.

Distributed tracing infrastructure is introduced when the application integrates enough external processing or separately deployed services to justify it.

## Deployment and Scaling

The backend must remain stateless and rely on PostgreSQL, object storage, the shared session store, and Keycloak for persistent state. This permits multiple backend replicas behind a load balancer.

Scaling order:

1. Measure request, database, media, and external API behavior.
2. Tune queries and indexes.
3. Scale stateless backend instances horizontally.
4. Scale or upgrade managed PostgreSQL and object storage as required.
5. Move expensive work to reliable asynchronous processing.
6. Extract a service only when the extraction criteria are met.

Kubernetes is not part of the initial architecture. A simpler container platform or single-host deployment is acceptable until availability or scale requirements justify a more complex orchestrator.

## Explicitly Excluded from the Initial Stack

- MongoDB.
- Kafka.
- RabbitMQ.
- Elasticsearch.
- Kubernetes.
- Redis without a measured requirement.
- A separate deployable service for every domain module.
- Storing customer images directly in the relational database.
- JWT access tokens stored in browser local storage.
- A Keycloak realm or OIDC client per customer organization.
- Direct Keycloak token management in the React applications.
- Keycloak as the source of truth for organization-specific roles and permissions.

## Consequences

### Benefits

- Simple local and production topology.
- Strong transaction boundaries for booking and records.
- One source of truth for business data.
- Lower operational and observability overhead.
- Clear module boundaries that support later extraction.
- Independent scaling of media storage from relational data.
- Authentication protocols, passkeys, and identity brokering are delegated to a specialized identity provider.

### Trade-offs

- A backend deployment releases all modules together.
- Poorly enforced package boundaries could turn the monolith into a tightly coupled codebase.
- PostgreSQL remains a shared scaling and availability dependency.
- Long-running AI and image work will require asynchronous execution and may eventually require a separate worker.
- A shared PWA requires careful role and navigation design for users who are both customers and professionals.
- Keycloak becomes critical infrastructure that requires upgrades, backups, monitoring, email configuration, and a branded login experience.
- Two related sessions exist: the Keycloak identity-provider session and the Spring application session.

## Decisions

1. Start with a modular monolith rather than microservices.
2. Use Java 25, Spring Boot 4.1, Maven, Spring Web MVC, and Spring Modulith.
3. Use PostgreSQL as the only application database.
4. Use relational modeling by default and `jsonb` only for genuinely flexible vertical-specific attributes.
5. Do not introduce MongoDB for customer records or images.
6. Store image bytes in private S3-compatible object storage and their metadata in PostgreSQL.
7. Use one React and TypeScript PWA for customer and professional workflows, selected by capabilities.
8. Use a separate React and TypeScript application for business administration.
9. Use Keycloak as the identity provider and authorization server, with one `smart-business` realm.
10. Use Spring Boot as an OIDC client and BFF, with secure server-side sessions rather than browser-managed bearer tokens.
11. Keep platform-wide roles in Keycloak and organization roles and permissions in PostgreSQL.
12. Use Docker Compose for reproducible local infrastructure.
13. Do not add infrastructure components without a demonstrated requirement.

## Reference Documentation

- [Spring Boot system requirements](https://docs.spring.io/spring-boot/system-requirements.html)
- [Spring Modulith reference](https://docs.spring.io/spring-modulith/reference/index.html)
- [Spring Security OAuth 2.0 and OpenID Connect](https://docs.spring.io/spring-security/reference/servlet/oauth2/)
- [Keycloak Server Administration Guide](https://www.keycloak.org/docs/latest/server_admin/)
- [Keycloak JavaScript adapter security guidance](https://www.keycloak.org/securing-apps/javascript-adapter)
- [PostgreSQL JSON types](https://www.postgresql.org/docs/18/datatype-json.html)
- [MongoDB GridFS reference](https://www.mongodb.com/docs/manual/core/gridfs/)
- [React with TypeScript](https://react.dev/learn/typescript)
- [Vite guide](https://vite.dev/guide/)
- [Docker Compose documentation](https://docs.docker.com/compose/)

## Open Questions

- Which S3-compatible implementation to use locally and which provider to use in production.
- Which UI component and styling system to use across the frontend workspace.
- Whether deployment hostnames use separate subdomains or path-based routing.
- Which email provider to use for magic links and notifications.
- Whether the non-Google verification flow uses a built-in Keycloak capability, a custom authenticator, or another verified mechanism.
- How Keycloak realm configuration, secrets, and environment-specific settings are promoted between environments.
- Branding and localization requirements for Keycloak-hosted authentication pages.
- Which production container platform and managed PostgreSQL provider to use.
- Whether AI initially uses a third-party provider or a separately hosted model.

# Domain and Data Ownership

## Domain Language

Core model names must not depend on the barbershop vertical.

| Core concept    | Barbershop label    | Nail salon label    |
| --------------- | ------------------- | ------------------- |
| Organization    | Barbershop          | Nail salon          |
| Location        | Branch              | Branch              |
| Professional    | Barber              | Nail technician     |
| Customer        | Customer            | Customer            |
| Service         | Haircut, beard trim | Manicure, nail art  |
| Appointment     | Appointment         | Appointment         |
| Customer record | Customer profile    | Customer profile    |
| Service record  | Haircut record      | Session record      |
| Technique       | Fade, scissors      | Kapping, extensions |
| Product         | Styling product     | Polish, gel         |

Vertical-specific fields can extend the generic service record without changing its core identity.

## Core Entities

### Organization

The paying tenant and primary data boundary. An organization may have one or more locations.

### Location

A physical or virtual place where services are delivered. Availability and professionals may be associated with one or more locations.

### User

A platform identity that can authenticate using one or more verified methods. A user may be a customer of several organizations and may also be a staff member.

The initial persistence model separates `platform_user` from `external_identity`.
The latter has a unique normalized OIDC `issuer + subject` pair and points to one
platform user. Verified email and display name are mutable profile attributes;
they are not identifiers and are never used to merge users.

### Organization membership

Associates a user with an organization as an owner, administrator, receptionist, or professional.

### Customer relationship

Associates a platform user with an organization as a customer. Organization-specific preferences and records belong under this relationship.

### Service

An offering configured by an organization, including its name, duration, price information, and eligible professionals.

### Appointment

A scheduled instance connecting an organization, location, customer relationship, service, time range, and optionally a selected professional.

### Service record

The record created in the context of an appointment or completed service. It may contain:

- Structured service details.
- Techniques.
- Products.
- Internal professional notes.
- Customer-visible notes.
- Original photos.
- AI-generated previews.
- Final-result photos.
- Visibility and consent metadata.

### Media asset

An uploaded or generated file with a defined purpose, owner organization, subject, visibility, source, and retention state.

### AI analysis

A traceable AI operation associated with a source image. It should distinguish input, recommendations, generated previews, selected result, model/provider metadata, status, and errors.

## Data Boundaries

The same platform user can have independent relationships with multiple organizations:

```text
Platform user
├── Customer relationship with Organization A
│   ├── Appointments
│   ├── Customer-visible service information
│   └── Organization A private records
└── Customer relationship with Organization B
    ├── Appointments
    ├── Customer-visible service information
    └── Organization B private records
```

Organization B cannot access Organization A's private records. A professional leaving Organization A does not automatically retain access to its customer records.

## Information Layers

### Platform identity data

- Verified email addresses.
- Verified phone numbers.
- External identity providers.
- Passkey credentials.

This data identifies the user but does not grant cross-organization access to service records.

### Customer-provided data

- Contact information.
- Preferences explicitly entered by the customer.
- Restrictions or sensitivities declared by the customer.
- Customer-uploaded reference images.

The rules for reusing customer-provided data across organizations remain an open product and legal question. The initial implementation should not assume automatic sharing.

### Customer-visible business data

- Appointment information.
- Images explicitly shared by the business.
- Customer-facing service summaries.
- AI previews explicitly shared by the business.

### Organization-private data

- Internal notes.
- Detailed procedures or formulas.
- Internal techniques and product quantities.
- Operational timing and costs.
- Internal customer-management information.

Organization-private data is not transferred to another organization through the customer's platform identity.

## Media Classification

Each media asset should record at least:

- Owning organization.
- Customer relationship.
- Related appointment or service record.
- Source: customer upload, professional capture, or AI generation.
- Purpose: reference, AI input, generated preview, or final result.
- Visibility: internal or customer-visible.
- AI-processing permission state.
- Marketing permission state.
- Creator and creation time.

Marketing permission must not be inferred from permission to store a photo or process it with AI.

## Initial Role Capabilities

| Capability                       | Owner        | Administrator | Receptionist  | Professional               | Customer             |
| -------------------------------- | ------------ | ------------- | ------------- | -------------------------- | -------------------- |
| Manage organization settings     | Yes          | Configurable  | No            | No                         | No                   |
| Manage staff and roles           | Yes          | Configurable  | No            | No                         | No                   |
| Manage services and availability | Yes          | Yes           | Configurable  | Own availability only      | No                   |
| Manage appointments              | Yes          | Yes           | Yes           | Assigned appointments      | Own appointments     |
| View customer records            | Yes          | Yes           | Configurable  | Authorized service context | Shared content only  |
| Create service records           | Yes          | Yes           | No by default | Yes                        | No                   |
| Capture service photos           | Yes          | Yes           | No by default | Yes                        | Customer upload only |
| Run AI-assisted previews         | Configurable | Configurable  | Configurable  | Yes                        | When enabled         |
| View internal notes              | Yes          | Yes           | No by default | Authorized records         | No                   |
| View metrics                     | Yes          | Yes           | Configurable  | Own metrics if enabled     | No                   |

Exact permissions should be policy-driven rather than permanently hard-coded to role names.

## Decisions

1. The organization is the tenant and primary boundary for business-created service records.
2. A global user identity does not make organization records portable.
3. Internal and customer-visible content must be modeled separately.
4. Original photos, AI-generated previews, and final-result photos are different media purposes.
5. Photo storage, AI processing, customer visibility, and promotional use require separate states or permissions.
6. A professional accesses records through an active organization membership and appropriate permissions.

## Open Questions

- Required media retention and deletion rules.
- Whether a customer can request or initiate record sharing between organizations.
- Which customer-provided fields, if any, are global rather than organization-specific.
- Whether professionals may view all organization customers or only customers associated with their appointments.
- Whether finalized service records can be edited, and whether changes require an audit history.

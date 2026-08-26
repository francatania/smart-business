# ADR 0002: Organization Lifecycle and Access Policy

- Status: Accepted
- Date: 2026-08-26
- Scope: Organizations, locations, memberships, and public booking routing

## Context

Smart Business needs a tenant boundary before later modules can create services, schedules,
appointments, customer relationships, or service records. Authentication identifies a platform
user but must not create organization access implicitly.

## Decision

### Organization lifecycle

- Only `platform_admin` creates an organization.
- A new organization is `pending` and the creator sends its first-owner invitation to a verified
  email address.
- It becomes `active` when that invitation is accepted. Only `platform_admin` may disable an
  organization. The MVP has no hard deletion.
- An active organization must retain at least one active owner. The last owner cannot be revoked
  or disabled. Ownership transfer and a platform break-glass path are out of scope.
- An active organization may have no locations while it is configured. Public booking requires at
  least one active location.

### Locations and professional assignments

- Locations are `active` or `inactive`; they are not hard-deleted.
- An inactive location accepts neither new public bookings nor new professional assignments.
- A professional-location assignment is effective only while its membership and location are
  active.
- Scheduling owns the outcome for future appointments when a location becomes inactive. This
  policy does not prescribe automatic cancellation, migration, or reassignment.

### Memberships and authorization

- Memberships use the fixed roles `owner`, `administrator`, `receptionist`, and `professional`.
  A membership may hold more than one role and its capabilities are the union of those roles.
- Owner and administrator may manage organization profile, locations, staff, non-owner roles, and
  professional-location assignments. Only an owner may grant or revoke owner. The last-owner
  invariant always applies.
- Receptionist may view the organization and its active locations. Scheduling will permit a
  receptionist to create, reschedule, reassign, and cancel appointments using only the booking
  context required for that work.
- Professional may view only assigned locations. Capabilities not listed here are denied until the
  epic that owns them defines them.
- `platform_admin` is a platform-wide Keycloak role, not an organization membership. It creates
  and disables organizations but does not bypass membership authorization for organization data.

### Invitations and organization context

- An invitation may be accepted only by the authenticated platform user whose verified email
  matches the invitation. Acceptance stores the stable platform-user identifier, never an email,
  name, or phone number.
- A wrong or changed email requires revoking the invitation and creating a new one. Email delivery
  belongs to Notifications.
- Administration routes and APIs carry `organizationId` explicitly. Every organization-scoped
  operation checks the current user's membership for that identifier. No active organization is
  stored in the application session.
- Portal uses the explicit public business link or a selected customer relationship or appointment
  as its organization context.

### Public presentation and slug

- The MVP exposes only the `BARBERSHOP` presentation template and uses the organization display
  name as its sole branding field.
- The public booking link is `/book/{slug}`. A slug is globally unique, 3 through 63 characters,
  and matches `^[a-z0-9]+(?:-[a-z0-9]+)*$`.
- Slugs are entered explicitly in lowercase ASCII; no transliteration or permissive normalization
  is applied. They may change only while the organization is `pending` and are immutable after
  activation.
- The `/book` namespace means organization slugs do not need a growing reserved-word list.
  Branding media, custom terminology, custom domains, slug redirects, and post-activation slug
  changes are deferred.

### Membership audit

- Invitations, memberships, roles, and professional-location assignments emit append-only audit
  events when their domain behavior is implemented.
- Events follow the existing audit conventions: UTC event time, organization, actor, aggregate,
  outcome, correlation identifier, and structured reason code. They contain no credentials,
  tokens, free-form sensitive text, or complete before/after snapshots.
- Events are retained for the organization's lifetime, including after it is disabled. Current
  owners have read-only business visibility when an audit query is added; `platform_admin` has
  operational visibility. This ADR creates neither a generic audit facility nor an audit UI.

## Consequences

- #89 can persist a deterministic tenant and membership model without deciding policy in code.
- #91 and #92 can manage locations and staff against explicit lifecycle and authorization rules.
- #93 and #94 can place organization scope in routes instead of synchronizing hidden session state.
- Scheduling (#6) owns availability and future-appointment transitions; Notifications (#11) owns
  invitation delivery.

## Follow-up Work

- [#89](https://github.com/francatania/smart-business/issues/89): persist organization, location,
  membership, owner bootstrap, and access resolution.
- [#90](https://github.com/francatania/smart-business/issues/90): manage organization profile,
  presentation, and public slug.
- [#91](https://github.com/francatania/smart-business/issues/91): manage locations.
- [#92](https://github.com/francatania/smart-business/issues/92): manage staff, roles,
  professional-location assignments, and audit events.

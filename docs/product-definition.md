# Product Definition

## Status

Initial product definition. These decisions should be refined before creating the implementation backlog.

## Product Vision

Smart Business is a business-to-business SaaS platform for appointment-based personal care businesses. It helps a business deliver consistent, personalized services by keeping customer preferences, appointments, service records, images, products, and techniques in one place.

The first supported vertical is barbershops. The product should be capable of supporting other verticals, such as nail salons, without redesigning its core domain model.

## Problem

Customers often rely on a particular professional because that person knows their preferences and previous results. If that professional is unavailable or leaves the business, another professional may lack the context required to provide a consistent service.

The platform preserves this context for the business, allowing an authorized professional within the same organization to understand previous services and customer preferences.

For the initial business model, the organization pays for the service. Customers do not pay the platform directly.

## Value Proposition

### For the business

- Preserve service knowledge when a customer changes professionals within the organization.
- Deliver more consistent and personalized results.
- Reduce dependency on an individual professional.
- Manage appointments, customers, and service history in one system.
- Improve customer retention and operational visibility.
- Use AI-assisted visual previews to support customer consultations.

### For the customer

- Book without creating and remembering a password.
- Review upcoming and previous appointments.
- Access information and images explicitly shared by the business.
- Communicate preferences more clearly using previous results and AI-assisted previews.

### For the professional

- See the context needed for the next service.
- Capture customer photos from a mobile device at the time of service.
- Create and update the customer service record.
- Use AI-assisted previews during the consultation.
- Record products, techniques, notes, and final results.

## Product Surfaces

### Customer PWA

A mobile-first progressive web app accessed from a business link, typically published in its Instagram profile or other social channels.

The customer can:

- Browse services and available times before signing in.
- Create a booking.
- Access upcoming and previous appointments.
- View customer-facing information shared by the business.
- Upload a photo and use AI-assisted style recommendations when this feature becomes available.
- Install the PWA for easier future access, without depending on an app store.

### Professional PWA

A mobile-first experience for professionals working for an organization. It may be delivered by the same PWA as the customer experience, with navigation and capabilities determined by role.

The professional can:

- View their schedule and appointment details.
- Access the organization's customer record when authorized.
- Capture or upload photos during a service.
- Run the AI-assisted preview with the customer during the consultation.
- Create a service record with images, products, techniques, and notes.
- Mark individual content as customer-visible when permitted by business policy.

### Business Administration Web Application

A desktop-oriented, responsive web application for owners, administrators, and reception staff.

The business can:

- Manage appointments and availability.
- Manage locations, professionals, services, and roles.
- Review customer relationships and service records according to permissions.
- Configure which record content may be visible to customers.
- Review operational metrics.
- Configure business branding and its public booking link.

## Product Principles

### Mobile booking first

The booking journey must work as a regular mobile website opened from Instagram or another embedded browser. Installing the PWA must never be required to create a booking.

### Progressive identification

Customers can browse availability without authentication. Identity verification is required only when confirming a booking or accessing private information.

### Business isolation by default

Each organization has an isolated customer relationship and private service records. Another organization cannot automatically access them, even if the same customer uses the platform elsewhere.

### Generic core, vertical-specific experience

The internal model uses generic concepts. The UI may present vertical-specific terms and fields so that the experience remains natural for each type of business.

### AI assists rather than guarantees

AI output is consultation support, not a guarantee that the real-world result will match a generated preview. Original photos, generated previews, and final-result photos must remain distinguishable.

### Explicit photo visibility

Capturing a photo does not make it customer-visible or promotional by default. Internal use, customer visibility, AI processing, and marketing use are separate concerns.

## Delivery Phases

### Phase 1: Core operations

- Organization, location, professional, and role management.
- Service catalog and professional availability.
- Public booking flow.
- Customer identity and organization relationship.
- Customer and professional PWA foundations.
- Business administration application.
- Customer service records with structured notes and images.
- Record visibility controls.
- Basic operational metrics.

### Phase 2: Retention and workflow improvements

- Booking reminders.
- Repeat a previous service.
- Improved customer-facing history.
- Service record comparison.
- Product recommendations.
- Additional operational and retention metrics.

### Phase 3: AI-assisted consultation

- Photo quality validation.
- Face and relevant feature analysis for the selected vertical.
- Style recommendations with explanations.
- Generated visual previews.
- Professional-assisted AI flow during an appointment.
- Customer self-service AI flow.
- AI usage controls, audit data, and cost tracking.

## Initial Metrics

- Appointments today and this week.
- Utilization by professional.
- New and returning customers.
- Cancellation and no-show rates.
- Most frequently booked services.
- Customer return frequency.
- Most requested days and times.

Revenue and average ticket metrics should only be considered reliable once the system records actual charged amounts or payments.

## Decisions

1. The initial vertical is barbershops, but core domain terminology must remain generic.
2. The paying customer is the business, not the end customer.
3. Customers and professionals use mobile-first PWA experiences.
4. Business administration uses a separate web experience.
5. The professional can capture photos, update service records, and use AI previews from the PWA.
6. The AI module is planned after the booking and service-record foundations.
7. The first booking creates or finds a platform user and creates an organization-specific customer relationship.

## Open Questions

- Whether the customer and professional experiences will be one deployed PWA or two separately deployed PWAs.
- Whether a business can customize vertical terminology or only choose from supported vertical templates.
- Which metrics are included in the initial subscription tier.
- Whether AI usage is included in a subscription, limited by quota, or billed separately.
- Whether a professional can create a walk-in appointment directly from the PWA.

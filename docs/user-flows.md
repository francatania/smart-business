# User Flows

## 1. First Booking from a Business Link

### Entry point

The business publishes a link in Instagram or another channel. The link opens its public booking page, for example:

```text
https://app.example.com/business-slug
```

### Flow

1. The customer opens the business page without signing in.
2. The customer reviews available services.
3. The customer selects a service.
4. The customer optionally selects a professional, depending on business configuration.
5. The customer selects a date and available time.
6. The system temporarily holds the selected slot while confirmation is in progress.
7. The customer enters their name and chooses an identification method.
8. The customer verifies their identity using Google, email, or another enabled method.
9. The system finds an existing platform user or creates one.
10. The system finds or creates the customer relationship with the organization.
11. The appointment is confirmed.
12. The customer receives confirmation and can add the PWA to the home screen.

### Requirements

- Browsing services and availability does not require authentication.
- Installing the PWA is never required for booking.
- The core flow must work in an embedded social-media browser.
- If an identity provider cannot run in the embedded browser, the UI must offer a clear fallback or an option to open the page in the system browser.
- An unverified submission must not create a permanently confirmed appointment.

## 2. Returning Customer Access

1. The customer opens the installed PWA or the business link.
2. An active secure session restores access without another sign-in.
3. If authentication is required, the customer uses a passkey, Google, email, or another linked method.
4. The customer sees upcoming appointments across the relationships available in the customer experience.
5. The customer selects a business relationship to review shared service information.
6. Organization-private information is never displayed.

## 3. Customer Appointment Management

1. The customer opens an upcoming appointment.
2. The customer reviews the location, professional, service, date, and time.
3. If permitted by business policy, the customer reschedules or cancels within the configured rules.
4. The system updates availability and records the change.
5. Relevant participants receive a notification through enabled channels.

## 4. Professional Daily Schedule

1. The professional opens the PWA and authenticates.
2. The PWA resolves the professional's active organization membership.
3. The professional sees today's assigned appointments.
4. The professional opens an appointment.
5. The system displays the information authorized for that service context:
   - Customer preferences.
   - Customer-visible requests or reference images.
   - Previous organization service records allowed by policy.
   - Relevant internal notes.
6. The professional starts or opens a draft service record.

## 5. Professional Photo Capture and AI-Assisted Consultation

This flow is part of the professional PWA and is planned for the AI delivery phase.

1. The professional opens the current appointment or customer relationship.
2. The professional starts the consultation flow.
3. The PWA explains the intended photo use and records the required permission state.
4. The professional captures a new photo using the device camera or selects an existing image.
5. The customer and professional review the source image before processing.
6. The system validates basic image suitability, such as framing, lighting, and orientation.
7. The professional requests AI analysis.
8. The system creates an AI analysis linked to the source image and service context.
9. The AI returns style recommendations and explanations relevant to the configured vertical.
10. The professional and customer select one or more recommendations to preview.
11. The system generates clearly labeled visual previews.
12. The professional and customer may select a preferred option as a reference for the service.
13. The selected reference is attached to the draft service record.
14. The business chooses whether the generated content is visible to the customer, subject to its policy.

### Rules

- AI output must be presented as an approximation, not a guaranteed result.
- The source image must not be overwritten by generated content.
- Generated previews must be visually and structurally identified as AI-generated.
- Failed or rejected AI operations must not block completion of the real-world service record.
- AI processing permission is separate from internal photo storage and marketing permission.
- AI access should be controlled by organization configuration, subscription, quota, or a future billing rule.

## 6. Customer Self-Service AI Flow

This is a later extension of the same AI capability used by professionals.

1. The authenticated customer opens the AI consultation feature for an eligible business relationship.
2. The customer reviews the photo-processing notice and provides the required permission.
3. The customer uploads or captures a photo.
4. The system checks image suitability.
5. The customer receives recommendations and requests previews.
6. The customer saves a preferred result as a reference.
7. The customer can associate the reference with a future appointment or show it during consultation.

Whether a customer-generated reference becomes part of a business service record must be explicit; it should not automatically expose organization-private data or imply professional approval.

## 7. Completing a Service Record

1. During or after the service, the professional updates the draft record.
2. The professional records structured service details.
3. The professional selects techniques and products used.
4. The professional enters internal notes and, separately, customer-visible notes.
5. The professional captures final-result photos when appropriate.
6. Each image is classified by purpose and visibility.
7. The professional reviews the record and finalizes it.
8. The finalized record becomes available to authorized organization staff.
9. Only explicitly customer-visible content appears in the customer PWA.

## 8. Business Appointment Administration

1. An owner, administrator, or receptionist opens the administration web application.
2. The user selects an organization and location when more than one is available.
3. The user views the calendar by day, week, professional, or location.
4. The user creates, reschedules, reassigns, or cancels appointments according to permissions.
5. Changes update professional schedules and customer-facing appointment details.
6. Relevant audit data is recorded.

## 9. Business Metrics

1. An authorized user opens the administration dashboard.
2. The user selects a date range and, optionally, a location or professional.
3. The dashboard shows metrics supported by reliable source data.
4. The user can navigate from aggregate values to the appropriate operational view when permitted.

Initial metrics include appointment volume, utilization, new and returning customers, cancellations, no-shows, popular services, return frequency, and demand by time.

## Open Questions

- Whether slot holds are required and how long they last.
- Whether customers choose a professional by default or only when the business enables it.
- Whether professionals can serve walk-in customers without a previous appointment.
- Whether service records support drafts, finalization, reopening, and version history in the first release.
- Which photo permissions require explicit customer confirmation at the time of service.
- Whether the professional AI flow can be used outside an active appointment.
- What happens when connectivity is lost while capturing photos or editing a draft record.

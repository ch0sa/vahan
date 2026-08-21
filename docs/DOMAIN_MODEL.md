# Domain Model

## Aggregate boundaries

### Account

- `User`
- `UserProfile`
- `Session`
- `TotpCredential`
- `ExternalIdentityReference`

TOTP secrets are encrypted and used only for prototype authentication.

### Vehicle projection

- `VehicleProjection`
- `VehicleOwnership`

`VehicleProjection` is explicitly non-authoritative and records source, external reference, source version when available, and last synchronization time.

Ownership is temporal rather than a mutable `owner_id`:

```text
VehicleOwnership
- id
- vehicle_projection_id
- owner_reference
- valid_from
- valid_until nullable
- source
- external_reference
- observed_at
- transfer_application_reference nullable
```

Intervals use `[valid_from, valid_until)`. Closing the seller interval and opening the buyer interval is one transaction performed only after simulated registry-completion evidence.

### Service and readiness

- `ServiceDefinition`
- `ServiceRule`
- `EligibilityResult`
- `DocumentRequirementSnapshot`

Every application pins the relevant definition and rule version. A readiness result means only “ready for this synthetic demo scenario.”

### Transfer case

- `Application`
- `ApplicationParticipant`
- `WorkflowEvent`
- `ExternalCaseReference`

The aggregate stores current state, monotonic version, scenario/rule version, vehicle projection reference, seller and buyer participants, and external handover state. It owns sequencing and authorization, not registry truth.

### Documents

- `DocumentRequirementSnapshot`
- `DocumentSubmission`
- `DocumentSubmissionVersion`

A requirement snapshot records participant, reason, required/conditional status, provenance/rule version, and external-verification status. Replacement preserves history.

### Payments

- `Payment`
- `PaymentAttempt`
- `PaymentProviderEvent`
- `PaymentReconciliation`

One logical payment may have several attempts but at most one confirmed settlement. Payment lifecycle remains distinct from application workflow.

### Integration and operations

- `InboxEvent`
- `OutboxMessage`
- `ExternalStatusEvent`
- `IntegrationAttempt`
- `Notification`
- `AuditEvent`

Inbox, workflow, and audit events are append-only at the application layer.

## Important relational constraints

- Unique participant role per application
- Seller and buyer must be distinct for the demo scenario
- Unique command idempotency key per actor/application
- Unique source plus external event ID
- Unique provider payment reference
- At most one confirmed attempt per logical payment
- At most one conflicting active transfer per vehicle projection
- Non-overlapping ownership intervals per vehicle projection
- `valid_until` is null or greater than `valid_from`
- Required foreign keys and non-null domain fields

## Transaction boundaries

Each state change commits the application update, workflow event, audit event, and outbox record atomically. Ownership interval close/open uses a strongly isolated transaction. External raw payloads may be retained in JSONB for diagnostics, but validated typed columns drive domain decisions.

## Synthetic fixtures

- Seller: Ananya Rao
- Buyer: Rahul Shetty
- Vehicle projection: KA01AB1234

No fixture may contain Aadhaar, PAN, real payment credentials, or realistic sensitive government identifiers.

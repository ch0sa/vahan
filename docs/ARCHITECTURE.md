# MoveKA Architecture

## Status

Architecture baseline for the first hackathon implementation. This document describes a synthetic prototype and does not claim live access to VAHAN, Sarathi, Karnataka RTO systems, identity systems, banks, financiers, or inspection systems.

## Architectural decision

MoveKA will begin as a modular Next.js monolith with PostgreSQL persistence and ports-and-adapters around every external authority. A modular monolith keeps transactions, deployment, and iteration simple for the hackathon while preserving replaceable integration boundaries.

The system of record split is fundamental:

- External authorities remain the source of truth for legal identity, vehicle ownership, statutory rules, fees, settlement, scrutiny, approval, and registry updates.
- MoveKA is the source of truth only for prototype accounts and citizen-facing orchestration: drafts, participant coordination, workflow events, document state, payment orchestration, notifications, audit history, and cached synthetic projections.

## System context

```text
Seller / Buyer
      |
      v
Next.js citizen UI and route handlers
      |
      v
Application services and command handlers
      |
      +-- identity and access
      +-- service catalogue and readiness rules
      +-- transfer workflow
      +-- document requirements
      +-- payment orchestration
      +-- government-case event processing
      +-- notifications
      +-- audit, inbox, and outbox
      |
      v
PostgreSQL orchestration store
      |
      +-- SharedPasswordDemoIdentityGate
      +-- MockVehicleRegistryProvider
      +-- MockPaymentProvider
      +-- MockRtoCaseProvider
      +-- InAppNotificationProvider
```

## Modules

1. **Identity and access**: fixed demo users, shared-password citizen access, opaque sessions, role and object authorization; legacy TOTP remains isolated to internal operator setup.
2. **Citizen and asset projections**: profiles, external identity references, synthetic vehicle projections, and temporal ownership observations.
3. **Service catalogue and readiness**: versioned synthetic service definitions, processing modes, document rules, provenance, and readiness explanations.
4. **Application workflow**: command handlers, guards, explicit server-side transitions, aggregate versions, and participant coordination.
5. **Documents**: requirement snapshots and versioned synthetic submissions.
6. **Payments**: logical payment obligations, attempts, provider events, ambiguity, and reconciliation.
7. **Government case integration**: external case references, inbound event processing, outbound commands, retries, and reconciliation.
8. **Notifications**: durable in-app notifications; delivery never determines workflow truth.
9. **Audit and operations**: append-only events, integration attempts, inbox/outbox records, and a protected demo event simulator.

## Core invariants

- Only the recorded seller can perform seller commands; only the named buyer can perform buyer commands.
- Buyer work cannot begin before seller completion is durably committed.
- The shared demo password proves only knowledge of a public prototype access code. Authorization still comes from the server session, role, and participant scope; none of these prove Aadhaar identity or registered ownership.
- A case is pinned to a versioned service/rule snapshot.
- Clients send commands; clients never set workflow state directly.
- Sending an external request never implies success. State advances only from defined acknowledgements or events.
- Approval and registry completion are different states.
- External timeouts, malformed replies, or unavailability never become success.
- Duplicate commands, callbacks, and events cannot repeat side effects.
- Stale or impossible external events are retained and quarantined without mutating the case.
- Payment ambiguity enters reconciliation; it does not cause an automatic second charge.
- Starting, submitting, paying for, or approving a transfer does not change projected ownership. Ownership history changes only after a registry-completion event.
- After the configured synthetic RTO handover, MoveKA cannot promise instant online withdrawal.
- Every privileged action, transition, external event, reconciliation, and simulator action is auditable.
- All demonstrated identities, documents, vehicles, payments, and government references are deterministic synthetic data.

## Reliability architecture

Application commands use a client idempotency key and optimistic aggregate version. Command processing locks the application row, rechecks authorization and guards, applies the transition, appends workflow/audit events, and enqueues any outbox message in one database transaction.

Inbound adapter events use a transactional inbox:

1. Persist the raw event with unique source and external event ID.
2. Resolve the external case reference.
3. Lock and load the application aggregate.
4. Validate ordering, current state, and the transition.
5. Apply the transition and enqueue notifications atomically.
6. Mark the inbox item processed after the transaction commits.

Outbound adapter calls use a transactional outbox and stable idempotency key. Retries are at-least-once, so every consumer is idempotent.

## Concurrency strategy

- Use an integer aggregate version for optimistic conflict detection.
- Use PostgreSQL row locking for transition execution.
- Use uniqueness constraints for command idempotency, provider events, logical payment confirmation, participant roles, and conflicting active transfers.
- Preserve draft input when an external event wins a race; reject stale submission with an actionable refresh message.
- Serialize payment finalization and ownership-interval updates.

## Security baseline

- Authorize every case, participant, vehicle, document, payment, and simulator operation server-side.
- Use secure HttpOnly SameSite cookies and CSRF protection appropriate to the chosen mutation mechanism.
- Compare the bounded demo password timing-safely; encrypt any legacy operator TOTP secret at rest; never log passwords, secrets, codes, tokens, document contents, or sensitive references.
- Rate-limit authentication, invitations, payments, uploads, and simulator actions.
- Validate all input with schemas and keep secrets in runtime configuration.
- Protect `/demo/backoffice` with a distinct demo-operator authorization and disable it when demo mode is off.

## Technical baseline

- Next.js App Router and TypeScript
- PostgreSQL and Prisma
- Zod at input and adapter boundaries
- Vitest for unit and service-level tests
- Playwright for end-to-end and browser recovery tests
- Minimal accessible components and CSS; no large UI kit initially

## Deliberate non-goals

- No live or undocumented government integration
- No replacement RTO officer product
- No authoritative fee, eligibility, timeline, or document claims
- No complete ownership-transfer UI in the first scaffold task
- No extra services until the first ownership-transfer journey is reliable
- No premature microservices, event broker, Redux store, or real payment/identity SDK

## Open questions

- Exact authoritative ordering of documents, payment, submission, and receipt for the selected scenario
- Authoritative withdrawal cutoff around payment and inwarding
- Exact synthetic facts used to select contactless versus RTO/vehicle-visit modes
- Buyer invitation/claim and decline behavior
- Which edits invalidate consent, readiness, or payment
- Correction versioning and external event ordering contract
- Handling a late payment success after withdrawal or failed submission
- Retention and deletion policy for demo documents, sessions, and legacy operator credentials
- Approved Kannada terminology for statutory concepts

## Workspace-isolated synthetic runs

Each reusable demonstration run is contained in a `Workspace` with explicit memberships. Vehicle projections, applications, and command receipts carry the workspace boundary. Citizen reads resolve the current member workspace before querying; application IDs alone are not authority. Creating a new demo journey provisions a fresh deterministic vehicle/ownership projection in a new workspace. Resetting requires a member, a `RESET` confirmation, receipt replay protection, and a serializable scoped transaction; it never performs a database-wide reset.

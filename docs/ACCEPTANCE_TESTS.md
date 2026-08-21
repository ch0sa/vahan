# Acceptance and Test Strategy

## P0 golden path

1. Ananya Rao signs into a fixed synthetic account with the shared demo password; no authenticator setup is required.
2. She sees synthetic vehicle projection `KA01AB1234` and selects ownership transfer.
3. The service explains seller-first sequencing and synthetic readiness/document rules.
4. Seller data, declarations, and required submissions are persisted.
5. A durable transfer case contains explicit `SELLER` and `BUYER` participants.
6. Rahul Shetty receives an in-app notification and can continue without re-entering identifiers MoveKA already knows.
7. Rahul authenticates separately and can perform only buyer-authorized actions.
8. Synthetic payment supports pending, failed, confirmed, and reconciliation-required states without losing the case.
9. Submission creates durable workflow and audit history.
10. The protected simulator can emit inwarded, correction, rejected, approved, and registry-complete events.
11. Status always explains what is happening, whether action is required, and what happens next.
12. Correction replacement preserves previous submission and audit history.
13. Approval and registry completion appear only from simulated external events.
14. Refresh, closure, session renewal, and transient adapter failure do not lose the case.

## Implemented synthetic buyer/case evidence

The recorded seller alone can invite the fixed synthetic Rahul fixture from `SELLER_VERIFIED`; a serializable command persists the buyer participant, deterministic buyer-information/document snapshot, in-app notification, audit/workflow record, and idempotency receipt together. Rahul can resume only cases where he is the recorded buyer, using his separate active demo session to record the synthetic acceptance. The bounded mock flow then supports payment, submission acknowledgement/outbox retry, ordered mock RTO inbox events, correction/recovery, withdrawal, and registry completion. No live integration exists.

The buyer view deliberately exposes deterministic synthetic metadata only and offers no document upload. It tells users not to upload real documents or identifiers. PostgreSQL transaction/concurrency behavior still requires a disposable database integration run; static schema/migration parity and unit coverage do not substitute for that run.

## Current bounded payment evidence

The prototype has one server-priced synthetic payment per application. The displayed amount is explicitly not an official fee and the UI never collects card, bank, or payment details. Initiation persists an outbox message, then a leased internal dispatcher calls only the deterministic mock provider. Definite failure is retryable; pending is not success; ambiguous, conflicting, unknown, or late evidence freezes reconciliation without an automatic retry. Provider callbacks use stored provider references, event-id deduplication, applied-event sequence ordering, and safe in-app notifications. A confirmed synthetic payment can create a mock government-submit outbox; timeout remains submitted/retryable and malformed replies quarantine. An acknowledgement is only a synthetic reference, never an official RTO/VAHAN receipt.

Malformed callback/RTO input deliberately retains only bounded allowlisted metadata/hash, not raw input, to avoid retaining accidental secrets. PostgreSQL callback/outbox/inbox races and browser E2E remain unexecuted locally.

## External-case acceptance

- Only a signed-in `DEMO_OPERATOR` with `DEMO_MODE=true` can use the simulator. It derives reference, next sequence and event ID server-side, restricts event kinds to current context, records audit/cooldown, and cannot act as a citizen participant.
- RTO events are durable inbox envelopes. The processor resolves only through the stored synthetic external reference, applies contiguous ordered events atomically, and records stale, duplicate, gap, malformed, unknown, and impossible evidence without fabricated progress.
- A correction stays required until the matching target participant submits a bounded synthetic correction and matching mock acknowledgement follows delivered correction outbox evidence.
- Approval is distinct from registry completion. Only matching registry completion with one current seller ownership and the recorded distinct buyer may mutate local temporal synthetic ownership.
- Withdrawal is a mock request, not cancellation. Pending withdrawal may be externally confirmed; an inwarding race moves to manual-RTO guidance. Late confirmation is quarantined.

## P0 forbidden behavior

- Buyer acts before seller completion or performs seller commands.
- Seller edits buyer-only data.
- An object ID or URL change reveals another user's case.
- The shared demo password or session is presented as government, Aadhaar, mobile, or ownership verification.
- Synthetic readiness, fee, timeline, approval, or registry status is presented as authoritative.
- Timeout, malformed response, pending payment, or unavailable adapter becomes success.
- Duplicate input causes a repeated charge, transition, case, event, or notification.
- A stale event overwrites newer state.
- Refresh or closure discards durable progress.
- Instant cancellation is offered after the configured RTO/manual boundary.
- The simulator is presented as an actual or proposed RTO officer system.
- Real personal, identity, vehicle, document, credential, or payment data is used.
- Secrets appear in client bundles, logs, URLs, fixtures, or screenshots.

## Test layers

### Unit

- Full allowed/forbidden transition matrix
- Role/action authorization matrix
- Shared-password gating, session expiry/rotation, and authorization boundaries
- Idempotency and effect uniqueness
- External event ordering and terminal-state guards
- Payment lifecycle and reconciliation
- Ownership interval invariants
- Readiness/document rule snapshots
- English/Kannada key completeness and mandatory disclosures

### Integration

- Prisma migrations, constraints, transactions, and rollback
- Seller/buyer handoff and notification persistence
- Adapter success, timeout, malformed reply, outage, retry, duplicate, and out-of-order event contracts
- Payment local/provider mismatch reconciliation
- Correction, rejection, approval, and registry-completion flows
- Inbox/outbox atomicity and retry behavior

### End to end

- Complete seller-to-buyer golden path
- IDOR and unauthorized participant actions
- Refresh/closure/resume at every state
- Double click, duplicate callback, duplicate event, two tabs, and concurrent participants
- RTO inwarding and withdrawal boundary
- Correction followed by approval or rejection
- 320px and 360px mobile journeys
- Keyboard-only English and Kannada journeys

### Security and privacy

- IDOR, privilege escalation, CSRF, XSS, injection, brute force, rate limits, session/cookie behavior, and secret leakage
- Forged simulator and provider events
- Synthetic-data scan for Aadhaar/PAN-like or real sensitive identifiers

## Accessibility and localisation acceptance

- No horizontal scrolling, clipped Kannada copy, or unusable touch targets in the golden path at 320-360px.
- All golden-path copy, validation, status, notification, empty, disclosure, and error states are translated.
- Logical focus order, visible focus, semantic headings/landmarks, associated labels, announced errors/status, safe dialog focus, adequate contrast, and reduced motion.
- Status is never communicated by color alone.
- The shared language switch persists only allowlisted `en`/`kn`, and the document language matches it. Critical synthetic/non-authoritative disclosure keys have static parity tests. A live in-app-browser pass verified persisted Kannada copy, `html[lang=kn]`, the skip-link target/focus, and no public-page horizontal overflow at 320px.
- Playwright coverage runs at desktop, 360×800, and 320×568. On 2026-08-21, the complete database-backed seller-to-registry journey passed once on desktop, and all 15 public accessibility, locale persistence, protected-route denial, disclosure, service-search, and overflow checks passed across the three viewports.

## Low-bandwidth and recovery acceptance

- Throttled or interrupted requests preserve saved progress.
- Loading, retry, offline, timeout, and stale-data states are understandable.
- Refresh during a request is safe.
- Upload and fetch retry do not duplicate side effects.
- Core status and resume views remain lightweight.

## Evidence required before claiming completion

- Automated output for P0 unit/integration suites
- At least one recorded E2E golden-path run
- Negative authorization, idempotency, ordering, and reconciliation evidence
- Mobile, accessibility, localisation, and low-bandwidth checks
- Explicit list of unavailable tooling and untested areas

## Citizen product shell and service catalogue

- The public home page explains the value proposition, accepts only the documented synthetic vehicle, exposes service categories, and keeps the non-authoritative disclosure visible.
- The service catalogue contains the 21 entries observed in the dated Karnataka VAHAN research pass and supports search and category filtering without presenting observations as policy.
- Each service has an addressable overview and a clear `Working demo`, `Case action`, or `Guided preview` status.
- Registration selects one of the fixed synthetic seller/buyer fixtures and never collects real identity or vehicle data.
- Signed-in citizens can reach dashboard, account, services, and their role-specific working journey from the persistent shell.
- Public shell tests cover landmarks, disclosure, locale persistence, protected-route denial, catalogue search, and horizontal overflow at desktop, 360×800, and 320×568.

## Navigable ownership-transfer demonstration

- Home, services, dashboard, and account remain visible as primary destinations on desktop and mobile.
- Signed-in users can switch deterministic demo accounts or sign out without guessing a route.
- Dashboard continuation resolves to the participant's actual next action, including buyer payment and post-submission case status.
- Seller, buyer, payment, and case screens use consistent breadcrumbs and a four-step journey indicator.
- Once the seller invites the buyer, the seller sees an explicit instruction and account-switch action for Rahul.
- The buyer completes payment through one clearly labelled simulated action: no money moves, no provider is contacted, no payment details are collected, and no official fee is claimed.
- Simulated completion leaves one confirmed payment attempt, closes open demo reconciliation, and makes buyer submission immediately reachable.
- Authenticated shell keeps dashboard, account, demo-account switching, and sign-out reachable on narrow screens. The dashboard resumes the buyer in payment states at the payment workspace and routes post-submission states to the protected case status.
- The citizen payment page has one primary simulated-payment action only. It collects no details, moves no money, calls no bank/provider, persists one confirmed synthetic attempt, resolves open synthetic reconciliation records, and then permits synthetic submission.
- Seller and buyer use the current opaque prototype session for their synthetic declarations; the citizen golden path does not require TOTP enrollment, QR scanning, or a step-up code. Citizen sign-in accepts only the two fixed synthetic accounts and the shared local demo password while demo mode is enabled; the operator bootstrap remains separate.

- A citizen member can create a separate synthetic workspace or explicitly reset only the current workspace. Reset recreates only that workspace's vehicle/application descendants, never another workspace or the full database.
- Dashboard, seller, buyer, payment, and case use the same server-derived state-progress mapping. Terminal records offer a new journey rather than a stale continuation.
- A citizen can select only a workspace with their own membership; selection resumes their participant-scoped seller, buyer, payment, or case route. The reset control requires a visible confirmation and affects only the selected workspace.
- An application-linked buyer notification resolves its workspace and resume route only after server-side buyer-participant and membership checks, so opening an invitation from another saved workspace cannot leak or use a stale workspace selection.

CI includes a PostgreSQL-backed seed-to-first-seller-draft smoke test. Local verification now covers the complete protected golden path plus PostgreSQL ownership-overlap, concurrent-active-transfer, and concurrent-confirmed-payment constraints. The broader adversarial callback, rollback, lockout, and transaction-race matrix remains tracked in the database integration plan.

## Reusable-workspace verification — 2026-08-21

- The complete migration chain deployed and the deterministic seed ran in disposable PostgreSQL schemas.
- `prisma/workspace-integration.ts` created a separate workspace and fresh vehicle, created a seller draft there, reset only that workspace, replayed the reset idempotently, preserved the default workspace application, and denied a demo-operator reset.
- The desktop Playwright golden path passed against another disposable schema using independent seller and buyer browser contexts. It exercised shared-password sign-in, new-workspace creation, seller handoff, buyer workspace selection, one-click demo payment, submission, and participant-driven demo completion.
- The verified forward workspace migration was then applied to the local preview database after a private pre-migration dump. Prisma client generation succeeded after the known preview process was restarted.
- The existing public preview database was never used by the destructive Playwright reset test.

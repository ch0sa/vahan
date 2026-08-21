# MoveKA — Build for India project overview

## One-line proposition

MoveKA helps a private-vehicle seller and buyer understand, coordinate and track an ownership-transfer journey without having to interpret fragmented portals, remember opaque identifiers or guess who must act next.

## The one problem being solved

The prototype should be judged on one focused problem:

> A normal private-vehicle sale involves two citizens and several external hand-offs, but the current experience makes the process difficult to discover, coordinate, resume and track.

MoveKA is not trying to replace VAHAN or redesign the RTO's legal decision. It is a citizen orchestration layer around that external process.

## Who faces the problem

- A seller who needs to initiate and declare the transfer correctly.
- A buyer who cannot continue until the seller finishes and who needs a clear invitation and next step.
- Citizens using a mobile phone, slower connection or limited digital experience.
- Citizens who do not know which transport portal, service name, form, identifier or status page applies.
- Both parties when an application pauses, needs correction, reaches payment, crosses into RTO processing or must be resumed later.

The current prototype models a fictional Karnataka private non-transport vehicle sale from Ananya Rao to Rahul Shetty using `KA01AB1234`.

## What is difficult today

The research audit found a fragmented ecosystem spanning Karnataka Transport information, VAHAN, Sarathi, permit systems, payment systems and physical RTO processes. Computerised submission does not mean automatic approval, and contactless/non-contactless behavior can vary.

The citizen difficulty is not simply unattractive screens:

- Service discovery starts from administrative categories rather than the person's goal.
- Citizens repeatedly handle registration, chassis and application identifiers.
- Seller and buyer responsibilities are separate but coordination is weak.
- Important guidance is mixed with dense information and system terminology.
- Status, payment, corrections, documents, appointments and withdrawal can live on different surfaces.
- External decisions are asynchronous, so a user needs reliable resume, retry and notification behavior.
- A bank success, online submission or RTO approval is not the same as a completed registry ownership change.

## What MoveKA changes

MoveKA proposes a single plain-language workspace for the citizen journey:

1. Start from `My vehicle` and the person's goal.
2. Explain the complete seller/buyer journey before asking for details.
3. Give each participant only the actions they can perform.
4. Save progress and show one clear next action.
5. Coordinate the seller-to-buyer handoff through a shared case.
6. Treat payment, RTO processing and registry completion as distinct states.
7. Keep corrections, retries, notifications and status in the same case timeline.
8. Clearly label government, identity, payment and registry results as external.

The deeper change is the orchestration model behind the interface: explicit workflow states, participant authorization, idempotent commands, transactional audit history, durable inbox/outbox records and a separation between application approval and registry completion.

## Why this is better

| Current difficulty | MoveKA approach |
|---|---|
| Find the correct administrative service | Search by plain-language need and vehicle context |
| Seller/buyer handoff is easy to lose | Named roles, invitation and participant-specific next actions |
| Re-enter identifiers to resume | Signed-in dashboard and saved case workspace |
| Unclear progress | One shared state model with participant-specific guidance |
| Payment result confused with application completion | Separate payment, submission, RTO and registry states |
| External delays look like failure or success | Pending, retry, reconciliation and correction states |
| Dense technical/legal information | Progressive disclosure and short contextual warnings |
| Government boundary is unclear | Persistent but unobtrusive prototype/external-authority disclosure |

## Main prototype journey

| Stage | Seller experience | Buyer experience | Current implementation |
|---|---|---|---|
| Start | Select fictional seller and sample vehicle | Not yet involved | Working synthetic flow |
| Readiness | Review sample vehicle and declaration | — | Working with fixed rules/data |
| Handoff | Invite Rahul and see that seller work is complete | Receive access to the shared workspace | Working, but account/browser switching is still awkward |
| Buyer review | Wait and track | Review fixed fictional information and checklist | Working synthetic flow |
| Payment | Track buyer progress | Confirm a clearly labelled fake payment | Working; no money/provider |
| Submission | See shared status | Submit the fictional application | Working synthetic flow |
| External processing | Track case | Track case | Simulated RTO inbox/outbox/events |
| Completion | See outcome | See outcome | Working synthetic ownership projection update |

## What works today

- A public product shell, service catalogue and service detail pages.
- One database-backed ownership-transfer happy path.
- Separate seller and buyer permissions within the synthetic case.
- Saved drafts/workspaces and a reset/new-journey mechanism.
- One-click fictional payment and submission.
- Case tracking, correction/withdrawal research paths and simulated completion.
- Persistent workflow, audit, inbox/outbox, payment and ownership records.
- Responsive navigation, English/Kannada infrastructure and automated accessibility checks.
- Automated unit, database smoke, integration and browser evidence for selected paths.
- A live Vercel deployment backed by Neon PostgreSQL.

## What is mocked

| Boundary | Prototype behavior | What real implementation would require |
|---|---|---|
| Identity | Fixed fictional accounts and shared `admin` password | Approved identity proofing, consent, recovery and secure authentication |
| Vehicle registry | Seeded `KA01AB1234` projection | Authorized registry API/contract and freshness/reconciliation rules |
| Eligibility/readiness | One versioned fictional rule | Authoritative state/RTO rules and governed rule changes |
| Documents | Fixed checklist/snapshots | Official requirements, encrypted storage, scanning, signatures and retention |
| Payment | Local one-click confirmation | Provider order, hosted checkout, signature verification, callback security, refund/reconciliation |
| Government submission | Local outbox and mock acknowledgement | Documented government interface, credentials, retries and operational support |
| RTO processing | Ordered fictional events | Authoritative status events or approved polling, plus human exception handling |
| Notifications | In-app records | SMS/email/WhatsApp/push providers, consent and delivery operations |
| Ownership completion | Synthetic temporal ownership update | Authoritative registry-completion evidence only |

No real personal information, vehicle record, payment detail, OTP, government request or legal outcome should be entered or inferred.

## How it was built

### Product and research

- A forensic audit of the Karnataka Transport/VAHAN/Sarathi ecosystem.
- A dated audit of 21 Karnataka VAHAN citizen-service entries using a fake registration supplied by the project owner.
- A deliberately bounded ownership-transfer scenario that preserves seller initiation, buyer continuation and the RTO/registry boundary.

### Application stack

- Next.js 16 App Router, React 19 and TypeScript.
- Server Components and Server Actions for the web application.
- PostgreSQL with Prisma for workflow persistence and constraints.
- Zod for bounded server input validation.
- Vitest for unit/policy tests and Playwright for browser checks.
- ESLint and TypeScript static checks.
- Vercel production hosting and Neon PostgreSQL in Singapore.

### Backend/process design

- Modular monolith for hackathon simplicity.
- Explicit server-side state machine rather than client-set status.
- Seller/buyer participant and object-level authorization.
- Optimistic aggregate versions and PostgreSQL transactions.
- Idempotency receipts for commands.
- Transactional inbox/outbox concepts for delayed, duplicated or out-of-order external work.
- Payment reconciliation states instead of automatic recharging.
- Separate `APPROVED` and `REGISTRY_UPDATE_COMPLETE` states.
- Append-style workflow/audit records and temporal ownership intervals.
- Versioned service/rule and readiness snapshots.

## How the idea can scale safely

The safe scale path is not to turn the mock adapters on and call them production integrations.

### Product scaling

1. Validate the ownership-transfer prototype with citizens and RTO-facing domain experts.
2. Measure confusion, completion, resume and handoff failures.
3. Support more vehicle/RTO variations only from authoritative requirements.
4. Add one service at a time behind its own rules, documents, state machine and acceptance tests.

### Technical scaling

1. Introduce true tenant/demo-instance isolation immediately.
2. Keep the modular monolith until load/team boundaries justify extraction.
3. Move inbox/outbox processing to durable workers and queues.
4. Add provider-specific adapters behind the existing ports.
5. Use object storage for encrypted/scanned documents.
6. Add observability, redaction, audit export, alerting, backups and disaster recovery.
7. Use KMS-managed secrets, least-privilege roles, rate limits and formal security testing.
8. Scale read views/caches independently while PostgreSQL remains the orchestration source of truth.

### Governance scaling

1. Obtain explicit authorization for every government/system integration.
2. Establish who owns rules, forms, fees, timelines and policy changes.
3. Perform privacy impact, security and accessibility reviews.
4. Define retention, deletion, correction, grievance and incident processes.
5. Never claim legal completion until the authoritative registry confirms it.

## Hackathon-requirement assessment

### Solve one clearly defined user problem

The intended answer is strong: seller/buyer coordination and progress tracking for a normal private-vehicle ownership transfer.

The current product surface is broader than necessary because it displays 21 services. The submission story should treat those as context/future extensibility and keep the judged working build focused on ownership transfer.

### Complete the main journey from start to finish

The engineered synthetic happy path exists and has passed a disposable-database browser test. However, shared public demo identities can expose another visitor's completed workspaces, and the owner reports live usability bugs. The current deployment should therefore be described as an early prototype until per-visitor isolation and a fresh-start production E2E pass are complete.

### Easier to understand than the current experience

MoveKA has a clearer shell, role separation, next actions and shared tracking concept. It still needs a cohesive screen-by-screen redesign, fewer technical concepts, a more obvious handoff and a trustworthy progress indicator. The concept satisfies the goal better than the current polish does.

### Designed for real Indian users

Positive foundations include mobile breakpoints, simple language, Kannada infrastructure, keyboard/accessibility checks and a low-asset UI. Gaps include incomplete Kannada copy, no screen-reader field study, no demonstrated throttled/offline recovery and no usability testing with people who have limited digital experience.

### Use mock/synthetic data for sensitive boundaries

This is satisfied by design. All current identities, vehicle data, payment, documents, OTP/history and government events are fictional. No live external system is called.

### Solve the deeper problem, not just the interface

The project addresses the deeper process through state, authorization, idempotency, resumption, asynchronous boundaries, reconciliation, audit and participant coordination. The weakest current point is not the domain model; it is translating that model into a simple, reliable public demo.

## Current shortcomings that must be stated honestly

- The public shared Ananya/Rahul identities do not isolate different real visitors.
- The product does not let a user create a genuinely isolated fictional account, buyer or vehicle.
- Reset and saved-workspace behavior can be confusing.
- Using two participant accounts remains cumbersome.
- Several pages still contain hard-coded English and incomplete localisation.
- The progress indicator is coarse and can feel disconnected from the user's actual next action.
- The final external process is collapsed into a participant-triggered simulation.
- Most catalogue services do not work beyond an overview.
- Documents, identity, payment, notification and government boundaries are mock-only.
- Several high-value concurrency/security tests remain plans rather than executed evidence.
- No production user research, analytics, performance budget, screen-reader study or slow-network study has been completed.

## Recommended submission framing

### Problem

“A private-vehicle sale is a shared government journey, but the seller and buyer have to navigate fragmented information, repeat identifiers and guess who acts next.”

### Solution

“MoveKA gives both people one guided, resumable transfer workspace while preserving payment, RTO approval and registry completion as external authoritative steps.”

### Working demonstration

“The seller starts, the buyer receives the handoff, reviews and confirms, completes a clearly fake payment, submits, and both track simulated external processing through registry completion.”

### Honest boundary

“All data and external actions are synthetic. MoveKA demonstrates the orchestration, state, recovery and citizen experience that approved production integrations would plug into.”

### Why it matters

“The innovation is not only a cleaner page. It is a reliable coordination layer that helps citizens understand responsibility, resume safely and distinguish submission from legal completion.”

## Suggested success measures

- Percentage of users who can explain seller versus buyer responsibility before starting.
- Fresh-demo start success rate.
- Seller-to-buyer handoff completion rate.
- Median time and number of screens to complete the synthetic journey.
- Resume success after browser closure or network interruption.
- Rate of users who correctly understand that payment/submission is not registry completion.
- Mobile completion and Kannada completion rates.
- Number of support interventions or wrong-route selections per journey.

## Final product principle

MoveKA should not win by pretending a complicated statutory process is instant. It should win by making responsibility, readiness, handoffs, progress, recovery and external authority understandable to ordinary citizens.

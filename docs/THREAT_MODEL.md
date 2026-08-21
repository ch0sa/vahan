# Threat Model

## Server-action and operator boundary

Next Server Actions rely on the framework's same-origin/origin checks; this prototype does not claim a custom CSRF token. Session cookies are HttpOnly, Secure where applicable, and SameSite. Every mutation still checks server-side session, role, participant/object authorization, idempotency, aggregate version and bounded cooldown. The separate synthetic `DEMO_OPERATOR` cannot satisfy citizen seller/buyer/payment/submission authorization. The installed Chromium run exercised same-origin Server Actions, independent seller/buyer/operator sessions, and unauthenticated protected-route denial; a forged cross-origin negative test remains outstanding.

## Assets

- Shared citizen demo password, separate operator credential, and session tokens
- Session tokens and authorization context
- Application/participant relationships
- Synthetic vehicle, document, payment, and external-case references
- Workflow state, audit history, inbox/outbox, and integration evidence
- Demo-operator permission and simulator events

## Trust boundaries

1. Browser to MoveKA server
2. Seller to shared transfer case
3. Buyer to shared transfer case
4. Server to PostgreSQL
5. Server to mock identity, registry, payment, RTO, and notification adapters
6. Demo simulator to citizen workflow
7. Local orchestration projection to externally authoritative truth

## Principal threats and controls

| Threat | Primary controls |
|---|---|
| IDOR and role confusion | Server-side object authorization; participant command guards; non-enumerable IDs are not treated as authorization |
| Duplicate/replay effects | User command idempotency keys; unique provider event IDs; one-confirmed-payment constraint; transactional command handling |
| Stale/out-of-order events | Provider sequence/version; aggregate locks; monotonic versions; quarantine and reconciliation |
| Session/demo-access compromise | Fictional data only; bounded timing-safe password comparison; secure opaque-session cookies; separate operator credential; no password/token logging |
| Forged simulator/provider events | Separate demo-operator role; `DEMO_MODE`; server-derived references/sequences/event IDs; state allowlist; persisted cooldown/audit; bounded synthetic envelope |
| Injection and XSS | Zod schemas; parameterized ORM; contextual output encoding; CSP; safe file handling |
| CSRF | Next Server Action same-origin/origin checks plus SameSite cookies; server-side session/object checks and idempotency. No custom CSRF-token claim. |
| Document abuse | Allowlisted size/type; isolated storage; randomized names; authorized download; never execute uploads |
| Sensitive-data leakage | Synthetic-only fixtures; redacted logs; secrets in environment; no document contents or tokens in URLs |
| Misleading legal/financial claims | Persistent prototype disclosures; separate approval/registry states; no authoritative fee/timeline/eligibility language |
| Availability/data loss | Durable drafts; transactional writes; retries; inbox/outbox; reconciliation; explicit unknown state |
| Audit tampering | Append-only application behavior; restricted database permissions; actor/source/timestamps on events |

Malformed external envelopes are intentionally stored as bounded allowlisted metadata plus a hash rather than raw payload. This limits accidental secret/PII retention but means an operator cannot use MoveKA as a forensic raw-message store.

## Abuse cases requiring tests

- Change application, document, payment, vehicle, or participant identifiers in requests.
- Replay seller/buyer commands, sessions, payment callbacks, and RTO events.
- Submit a lower sequence event after registry completion.
- Forge a simulator event as a citizen.
- Confirm two payment attempts concurrently.
- Submit from two browser tabs with the same aggregate version.
- Inject scripts in names, correction reasons, document metadata, and notification text.
- Leak demo/operator credentials, session tokens, or synthetic documents through logs/errors.
- Run the application with demo mode disabled and verify the simulator is unavailable.

## Deferred production concerns

The prototype does not establish production-grade government integration, legal identity proofing, document malware scanning infrastructure, key-management operations, official retention policy, or authoritative callback authentication. Any future deployment requires a new threat model and formal security/privacy review.

## Workspace isolation

The current workspace is an HttpOnly selection backed by a server-side membership. Citizen route reads include workspace and participant scope, and workspace reset validates membership and an exact confirmation inside its serializable transaction. This reduces cross-workspace IDOR and prevents a reset command from deleting another workspace.

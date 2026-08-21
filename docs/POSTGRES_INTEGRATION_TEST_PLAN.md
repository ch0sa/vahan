# PostgreSQL integration test plan and status

Executed locally on 2026-08-21 against the disposable `moveka_verify` PostgreSQL 16.15 database:

- complete baseline migration deployment and deterministic seed;
- seed-to-seller-draft database smoke;
- overlapping temporal ownership rejection;
- concurrent one-active-transfer enforcement; and
- concurrent one-confirmed-payment-attempt enforcement.

The executable focused constraint suite is `prisma/integration.ts` (`pnpm test:db-integration`). The remaining scenarios below are still a test plan, not passed evidence.

Run it only against a disposable PostgreSQL database after applying the complete baseline migration and deterministic seed.

1. Parallel `InviteBuyer` for the same seller/application: use the same intent twice and two distinct intents concurrently. Assert one `BUYER` participant, buyer snapshot, notification, workflow/audit event and transition; assert an identical receipt replay returns the same result and a same-key/different-request hash fails.
2. Parallel `CompleteBuyerAcceptance`: submit one valid TOTP step concurrently. Assert exactly one declaration/transition/receipt and no second TOTP consumption or event; identical completed receipt replay returns the original result.
3. Invalid and locked TOTP: repeatedly submit incorrect values. Assert `failedAttempts` and `lockedUntil` commit while the application state/version, declaration, workflow event and receipt remain unchanged; assert the locked response is safe and actionable.
4. Force a late failure after successful step consumption (for example a failing declaration insert in a test transaction). Assert the successful consume, application transition, declaration, event and receipt all roll back together.
5. Tamper buyer information/checklist content or replace the latest readiness result. Assert acceptance rejects until the stored canonical content hash is restored and the seller declaration references the current ready result whose rule hash equals the pinned application rule.

These tests must not call live identity, registry, payment, or government services.

## Payment callback extension (partially executed)

1. Send ordered, duplicate, stale and same-sequence-conflicting mock provider events. Assert the unique event envelope survives, duplicates/stale events do not repeat effects, and conflicts enter reconciliation.
2. Send an unknown provider reference and a malformed envelope. Assert quarantine with no application/payment success.
3. Race two `CONFIRMED` events/attempts. Assert PostgreSQL partial uniqueness leaves one confirmed attempt and the losing event is quarantined/reconciled.
4. Confirm an old failed attempt after a newer attempt exists. Assert reconciliation rather than automatic confirmation. Verify `FAILED` alone permits a later attempt; pending or reconciled attempts do not.
5. Force an exception after provider-event persistence. Assert event disposition, payment/application transition, workflow/audit, reconciliation and deduped notification commit or roll back together.

6. Claim a due outbox record concurrently and recover an expired lease. Assert one provider dispatch per stable outbox key, safe completion/failure metadata, and no direct browser-to-provider call.
7. Verify malformed input stores only bounded metadata and a hash, never raw payload contents; browser checks confirm the payment page requests no card/bank data.

## External-case and withdrawal extension (not executed)

1. Race two claims for `GOVERNMENT_CASE_SUBMIT`, then expire a lease. Assert one mock dispatch/ack reference, one guarded `SUBMITTED` to `SENT_TO_RTO` transition, and one notification per participant. Verify timeout is retryable and malformed output quarantines while the application stays submitted.
2. Persist duplicate, lower, equal-conflicting, gap, and next-contiguous mock RTO envelopes. Assert transaction one retains the bounded safe envelope; transaction two advances only the applied cursor and does not repeat workflow/audit/notification effects.
3. Force an exception during an allowed processor event. Assert the first durable inbox envelope remains pending for later retry and no partial aggregate/cursor/ownership effects survive.
4. Test correction acknowledgement before/after matching submitted correction and delivered correction outbox. Assert only the latter resolves the request and returns processing.
5. Race mock submission acknowledgement with withdrawal request. Assert the reference/outbox completes while application state remains `WITHDRAWAL_PENDING`; then test inwarding moves it to manual guidance and late withdrawal confirmation is quarantined.
6. Test registry completion with zero, two, expired, or wrong-owner current ownerships and with a seller/buyer match. Assert only the valid case closes the seller interval and opens exactly one buyer interval at the same synthetic effective time.
7. Browser checks now cover independent citizen/operator sessions through the complete synthetic journey, same-origin Server Actions, protected case navigation, and unauthenticated seller-route denial. Forged cross-origin requests and a dedicated raw-payload/internal-enum rendering audit remain outstanding.

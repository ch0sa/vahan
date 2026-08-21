# Ownership Transfer Workflow State Machine

## Scope

These are MoveKA orchestration states for the synthetic normal-sale scenario. They are not claimed to be VAHAN or RTO internal states.

## Commands and transitions

| Current state | Command or external event | Principal guards | Next state |
|---|---|---|---|
| none | `CreateTransferDraft` | Authenticated seller; scoped synthetic vehicle; no conflicting transfer | `DRAFT` |
| `DRAFT` | `StartSellerStep` | Caller is seller | `SELLER_ACTION_REQUIRED` |
| `SELLER_ACTION_REQUIRED` | `CompleteSellerDeclaration` | Seller only; active authenticated session; seller data and consent complete | `SELLER_VERIFIED` |
| `SELLER_VERIFIED` | `InviteBuyer` | Valid synthetic buyer; participant uniqueness | `BUYER_ACTION_REQUIRED` |
| `BUYER_ACTION_REQUIRED` | `CompleteBuyerAcceptance` | Named buyer; recent verification; seller completion remains valid | `BUYER_VERIFIED` |
| `BUYER_VERIFIED` | `CreateSyntheticPayment` | Named buyer; exact synthetic evidence snapshots remain valid | `PAYMENT_REQUIRED` |
| `PAYMENT_REQUIRED` / `PAYMENT_FAILED` | `InitiateSyntheticPayment` | Named buyer; a prior attempt is absent or definitely failed | `PAYMENT_PENDING` |
| `PAYMENT_PENDING` | `ProviderPaymentFailed` | Matched synthetic provider evidence | `PAYMENT_FAILED` |
| `PAYMENT_PENDING` | `ProviderPaymentConfirmed` | Matched ordered synthetic provider evidence | `PAYMENT_CONFIRMED` |
| `PAYMENT_PENDING` | `ProviderPaymentAmbiguous` | Ambiguous, conflicting, or late synthetic evidence | `PAYMENT_RECONCILIATION_REQUIRED` |
| `BUYER_VERIFIED` | `EvaluateRequirements` | Pinned rule version | `DOCUMENTS_REQUIRED` or `READY_FOR_SUBMISSION` |
| `DOCUMENTS_REQUIRED` | `SubmitDocument` | Participant owns requirement; safe file; applicable snapshot | unchanged |
| `DOCUMENTS_REQUIRED` | `ConfirmReadiness` | All required items satisfied | `READY_FOR_SUBMISSION` |
| `READY_FOR_SUBMISSION` | `CreatePayment` | Synthetic fee/rule version; no active or confirmed obligation | `PAYMENT_REQUIRED` |
| `PAYMENT_REQUIRED`, `PAYMENT_FAILED` | `InitiatePaymentAttempt` | Valid idempotency key; no confirmed attempt | `PAYMENT_PENDING` |
| `PAYMENT_PENDING` | confirmed provider event | Recognized event; reference and obligation match | `PAYMENT_CONFIRMED` |
| `PAYMENT_PENDING` | failed provider event | Recognized terminal failure | `PAYMENT_FAILED` |
| `PAYMENT_PENDING` | timeout or conflicting evidence | Settlement cannot be determined safely | `PAYMENT_RECONCILIATION_REQUIRED` |
| `PAYMENT_RECONCILIATION_REQUIRED` | reconciliation result | Provider lookup resolves or remains ambiguous | confirmed, failed, or unchanged |
| `PAYMENT_CONFIRMED` | `SubmitApplication` | Buyer only; readiness still valid; payment confirmed; no unresolved edits | `SUBMITTED` |
| `SUBMITTED` | mock submission acknowledgement | External case reference committed atomically | `SENT_TO_RTO` |
| `SENT_TO_RTO` | `INWARDED` event | Matched case and valid ordering | `RTO_PROCESSING` |
| `RTO_PROCESSING` | correction event | Requested item and safe explanation present | `CORRECTION_REQUIRED` |
| `CORRECTION_REQUIRED` | `SubmitCorrection` | Authorized participant; requested correction supplied | unchanged until acknowledged, then `RTO_PROCESSING` |
| `RTO_PROCESSING` | approval event | Recognized authoritative synthetic event | `APPROVED` |
| `RTO_PROCESSING` | rejection event | Recognized event with safe reason/reference | `REJECTED` |
| `APPROVED` | registry-complete event | Approved matching case; event is not stale | `REGISTRY_UPDATE_COMPLETE` |
| `SUBMITTED` / `SENT_TO_RTO` | `RequestWithdrawal` | Exact citizen participant; before inwarding | `WITHDRAWAL_PENDING` |
| `WITHDRAWAL_PENDING` | `WITHDRAWAL_CONFIRMED` event | Matching ordered mock case event | `WITHDRAWN_EXTERNALLY_CONFIRMED` |
| `WITHDRAWAL_PENDING` | `INWARDED` event | Matching ordered mock case event | `WITHDRAWAL_REQUIRES_RTO` |

## Withdrawal

- Before the configured external cutoff, `RequestWithdrawal` creates an external request and enters `WITHDRAWAL_PENDING`.
- If submission acknowledgement races with a pending withdrawal, MoveKA records the synthetic reference and completes the submission outbox but preserves `WITHDRAWAL_PENDING`.
- Only external confirmation enters `WITHDRAWN_EXTERNALLY_CONFIRMED`.
- After inwarding or another configured manual boundary, the case displays `WITHDRAWAL_REQUIRES_RTO`; this is guidance, not proof of withdrawal.
- The exact cutoff is synthetic and must be versioned rather than inferred from undocumented behavior.

## Terminal and guarded behavior

- Success terminal: `REGISTRY_UPDATE_COMPLETE`
- Failure terminal: `REJECTED`
- Withdrawal terminal: `WITHDRAWN_EXTERNALLY_CONFIRMED`
- `APPROVED` is not terminal because registry completion is still pending.
- A terminal state can change only through an explicit, audited authoritative correction/reconciliation path.
- No client request may send a target state.

## Duplicate and ordering rules

- A repeated user command with the same idempotency key returns the original outcome.
- Duplicate provider callbacks and RTO events are recorded once and cause no repeated transition or notification.
- Provider sequence/version wins over timestamps.
- A stale event is retained as ignored; it cannot regress the aggregate.
- A contradictory or impossible event is quarantined and triggers reconciliation.
- Unknown-case events remain pending/quarantined rather than being discarded.
- The inbox resolves a case only through the persisted synthetic external reference. It stores first, then processes serializably; only the next contiguous sequence can apply. Gaps remain pending, stale/duplicate events cannot repeat effects, and contradictory/impossible events are quarantined.
- Malformed mock envelopes retain only bounded allowlisted metadata and a content hash, never raw payload input.

## Recovery rules

- Browser closure and refresh have no workflow effect.
- Failed uploads remain retryable without losing the case.
- Ambiguous payment enters reconciliation rather than immediate retry.
- Correction resubmission returns to processing only after external acknowledgement.
- External outage copy says status cannot currently be confirmed; it never fabricates progress.
- If an external event arrives while a user edits, preserve the draft and reject a stale submit with an actionable refresh/review response.

## Workspace/run boundary

The ownership state machine runs per application inside a synthetic workspace. `REJECTED`, `REGISTRY_UPDATE_COMPLETE`, and `WITHDRAWN_EXTERNALLY_CONFIRMED` are terminal history and offer **Start another journey** instead of resuming a stale case. Workspace creation/reset is local demo data management, not a government-process transition.

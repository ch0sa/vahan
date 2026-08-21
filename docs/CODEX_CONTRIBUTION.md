# Codex Contribution Record

## RUN 1 — Architecture and technical skeleton

Date: 2026-08-20

Codex was used as the primary engineering coordinator. The work was deliberately divided by task shape to limit unnecessary model usage:

- `architect` — GPT-5.6 Sol, high reasoning: system boundaries, aggregates, invariants, state machine, idempotency, event ordering, concurrency, database constraints, and overclaim review.
- `code_mapper` — GPT-5.6 Luna, medium reasoning: empty-repository assessment, minimal project structure, dependencies, scripts, Prisma/test/CI layout, and Windows risks.
- `qa` — GPT-5.6 Luna, medium reasoning: golden-path criteria, forbidden behavior, recovery, authorization, payment, external-event, accessibility, localisation, and low-bandwidth test requirements.
- Main coordinator: read the complete audit, reconciled the three reports, resolved terminology and scope, and authored the architecture document set.

Artifacts produced so far:

- `CURRENT_SYSTEM_AUDIT.md`
- `ARCHITECTURE.md`
- `SERVICE_BOUNDARIES.md`
- `DOMAIN_MODEL.md`
- `WORKFLOW_STATE_MACHINE.md`
- `ACCEPTANCE_TESTS.md`
- `THREAT_MODEL.md`
- `DEMO_SCOPE.md`

Material Codex decisions include:

- Modular monolith with ports-and-adapters rather than premature services
- PostgreSQL as the MoveKA orchestration store, never the government registry
- Temporal synthetic ownership projection rather than mutable `vehicle.owner_id`
- Approval separated from registry completion
- Command-driven server-side state transitions
- Transactional inbox/outbox, event quarantine, idempotency, and reconciliation
- One source-code-writing agent at a time

The technical scaffold and its verification results are recorded below. No application feature is credited before it exists and passes its reported checks.

## RUN 1 — Technical skeleton implementation

Date: 2026-08-20

Implemented artifacts:

- Next.js App Router/TypeScript shell in `app/`, including persistent accessible disclosures that this is an independent prototype using synthetic data and simulated authorities.
- PostgreSQL Prisma model in `prisma/schema.prisma`, covering prototype accounts, TOTP credential storage shape, vehicle projections and temporal ownership, versioned services/rules, applications/participants/workflow events, document versions, payments/reconciliation, external cases, inbox/outbox, notifications, audit, and integration attempts.
- Complete Prisma-generated PostgreSQL baseline migration plus PostgreSQL-specific constraints in `prisma/migrations/20260820000000_run_1_baseline/migration.sql`: ownership interval validity/non-overlap, active-transfer uniqueness, and one confirmed payment attempt. The baseline has subsequently grown with bounded prototype stages; static parity is maintained with the Prisma model count.
- Deterministic seed in `prisma/seed.ts` for synthetic Ananya Rao, Rahul Shetty, and projection `KA01AB1234`; it contains no government identity numbers, payment credentials, or usable TOTP secret.
- Pure transfer state/guard module, explicit idempotency/event-ordering types, and unit tests under `src/domain/`; tests cover seller-first and buyer-submission authorization, payment ambiguity/reconciliation, correction acknowledgement, withdrawal confirmation, approval versus registry completion, and duplicate/stale external events.
- Ports plus honest mock placeholders under `src/adapters/`; no live government, identity, payment, or notification SDK is present.
- Project scripts/configuration, Playwright shell test, `.env.example`, `.gitignore`, pnpm lockfile, and PostgreSQL GitHub Actions CI in `.github/workflows/ci.yml`.

Commands actually run and outcomes:

- `pnpm install` — completed after temporary network permission; produced `pnpm-lock.yaml`. Dependency build approval was configured in `pnpm-workspace.yaml`.
- Prisma CLI `validate` with a local placeholder `DATABASE_URL` — passed: schema is valid.
- Prisma CLI `generate` — passed after downloading the Prisma Windows engine.
- TypeScript `tsc --noEmit` — passed.
- ESLint — passed.
- Vitest — passed: 1 file, 7 tests.
- `next build` — passed: optimized production build completed successfully.
- Prisma migration/seed — not run: no PostgreSQL service or Docker is available on this host.
- Playwright E2E — not run: no Playwright browser is installed and no local test server was started.

Remaining RUN 1 risks/next checks:

- Apply the migration and run `pnpm db:seed` against a disposable PostgreSQL database before relying on persistence behavior.
- Install a Playwright browser and run the shell E2E test.
- Historical RUN 1 note: later bounded stages implemented the prototype journey, authentication screens, payment UI, simulator, and server-side command handlers described above; live integrations and the verification gaps listed in the current scope remain out of scope.

## RUN 1 — Prototype identity/access foundation

Date: 2026-08-20

Implemented a PostgreSQL-backed identity/access foundation without adding the transfer journey: Prisma repositories for synthetic users, sessions and TOTP credentials; AES-256-GCM encrypted TOTP secrets; RFC-compatible `otpauth` enrollment/verification; QR-code enrollment; HMAC-hashed opaque sessions; expiry, logout, rotation repository support; replay prevention and bounded lockout; application role/IDOR guard helpers; and minimal accessible synthetic-account helper, enrollment, sign-in, signed-in and sign-out routes. The helper and all identity copy explicitly state that this is prototype-only authentication, not Aadhaar, VAHAN, government, phone, or ownership verification.

Schema/migration changes add session token hashes and lifecycle fields plus encrypted TOTP IV, accepted-step and failure/backoff fields. The deterministic seed still does not create a usable TOTP secret.

Commands actually run for this stage:

- Prisma `validate` with placeholder `DATABASE_URL` — passed.
- Prisma `generate` with placeholder `DATABASE_URL` — passed.
- TypeScript `tsc --noEmit` — passed.
- ESLint — passed.
- Vitest — passed: 2 files, 12 tests, including TOTP success/replay/backoff, session expiry/logout semantics, IDOR authorization and disclosure copy.
- `next build` — the initial local process retained a stale lock and was stopped; the clean retry compiled successfully, completed type checking, generated build output, and exited with no remaining `.next` lock.

Remaining verification risk: PostgreSQL-backed repository/session integration tests and seed/migration deployment were not run because this host has no PostgreSQL or Docker. Playwright browser testing also remains unavailable.

## RUN 1 — Identity hardening follow-up

The identity routes now fail closed when `DEMO_MODE` is not exactly `true`; the signed-in route requires a live, non-revoked, non-expired database session. Enrollment is created only by an explicit action, never on GET/refresh. A high-entropy HMAC-signed enrollment challenge is stored in an HttpOnly cookie and checked against a server-side hash; enrolled credentials cannot be overwritten by the synthetic-account helper. Successful verification uses a conditional TOTP-step consume and session creation transaction, preventing concurrent replay from producing multiple sessions. Switching demo accounts revokes the current browser session; successful sign-in rotates a prior browser session.

## RUN 5 + RUN 6 — Synthetic registry/readiness seller foundation

Added versioned service-definition identity, exact synthetic registry projection metadata and temporal owner reference, pure Zod readiness evaluation, persisted readiness/seller-declaration/command-receipt schema seams, deterministic mock registry data, seller-draft transactional command skeleton, and readiness tests. The evaluator accepts only seeded seller Ananya Rao with `KA01AB1234`, mock provenance/version, Karnataka registration and private non-transport projection; all other or malformed projections are `UNKNOWN`. The only processing mode is `DEMO_RTO_HANDOVER`, not a statement about official contactless eligibility or RTO outcome. Static verification passed: Prisma validate/generate, TypeScript, ESLint and Vitest (19 tests). PostgreSQL transactional integration tests remain unavailable locally.

Correction pass: application records now pin a single immutable service-rule relation and canonical JSON snapshot; readiness findings are structured and include READY/BLOCKED/UNKNOWN synthetic outcomes. Exact citizen participant authorization no longer treats a demo operator as seller or buyer. Final static checks passed with 20 Vitest tests, lint and production build; live PostgreSQL concurrency/retry behavior is still not run locally.

Follow-up verification: Prisma validate/generate, TypeScript, ESLint and the production build passed. Vitest passed 17 tests, including conditional TOTP consume/replay, signed enrollment challenges, no enrolled-credential overwrite, demo-disabled behavior, error mapping and canonical 32-byte base64 key validation. PostgreSQL integration tests remain unavailable on this host, so transaction behavior is covered by repository conditional logic plus pure unit tests rather than a concurrent database run.

## RUN 7 — Synthetic buyer handoff through buyer verification

Implemented an explicitly bounded buyer flow only through `BUYER_VERIFIED`. `BuyerFlowService` uses serializable command transactions and durable receipts for seller-only buyer invitation and Rahul-only buyer acceptance. The invitation records the fixed Rahul participant, a deterministic buyer-information snapshot, synthetic document checklist, in-app notification, audit/workflow events, and the receipt atomically. Buyer acceptance requires the existing seller declaration and ready snapshot, complete deterministic evidence, a fresh replay-protected prototype TOTP code, and the expected aggregate version. Invalid code failure metadata is committed without changing the workflow; a successful step consumption and buyer declaration/transition commit atomically. No payment, submission, RTO, government identity, live registry, or document upload was added.

The protected buyer routes are fail-closed outside demo mode, require Rahul's active session and exact participant membership, avoid object-ID existence disclosure, centralize prototype-only copy, and offer a synthetic notification/resume view. Schema and the complete baseline migration now include `BuyerInformationSnapshot` and `BuyerDeclaration`; the seed remains deterministic and contains no usable TOTP secret or real identifiers.

Verification for this stage is recorded after the commands complete below. PostgreSQL migration/seed/integration testing remains unavailable locally because no PostgreSQL service or Docker is installed; transaction and duplicate-concurrency claims need that disposable-database run before release.

Commands actually run for RUN 7:

- Prisma `validate` with a placeholder `DATABASE_URL` — passed.
- Prisma `generate` with a placeholder `DATABASE_URL` — passed.
- TypeScript `tsc --noEmit` — passed.
- ESLint — passed.
- Vitest — initially passed: 5 files, 23 tests; the subsequent RUN 7 correction passed: 6 files, 27 tests.
- Static model/table count — passed: 31 Prisma models and 31 baseline migration tables.
- `next build` — passed, including protected `/buyer` and `/buyer/notifications` routes.

RUN 7 correction: invite now checks that the exact recorded seller is a `CITIZEN`, deterministic per-command/version intent identifiers replace render-time random values, buyer snapshot hashing uses shared canonical serialization, and buyer TOTP failures preserve `INVALID`/`REPLAY`/`LOCKED` reason through the committed failure branch for safe UI mapping. Notifications link to their application and remain recipient- and participant-scoped. `POSTGRES_INTEGRATION_TEST_PLAN.md` records the required unexecuted concurrency, replay, lockout and rollback checks.

## RUN 8 — Synthetic payment slice foundation

Added bounded synthetic payment persistence: immutable server-priced snapshots, one logical payment per application, ordered idempotent attempts, provider-event/reconciliation shapes, partial PostgreSQL uniqueness constraints, and notification dedupe support. The buyer payment route is participant- and demo-mode protected and explicitly says it is neither a bank screen nor an official fee; it collects no payment details. `PaymentFlowService` writes payment initiation and its `PAYMENT_CREATE_REQUESTED` outbox record atomically, then dispatches to the deterministic mock outside the transaction. Definite pre-send failure, ambiguous timeout, and malformed responses never become success; ambiguous outcomes enter reconciliation and do not auto-retry. No submission, RTO, ownership, or live payment provider has been implemented.

The follow-up adds a protected internal service ingestion seam for typed mock provider events. It resolves only by stored provider reference, stores known/unknown raw safe envelopes with a disposition, deduplicates by source/event identifier, recognizes stale and conflicting sequences, and applies payment/application/workflow/audit/reconciliation/notification effects in a serializable transaction. It is not exposed as a public route or a live provider integration. The database-specific callback race evidence is explicitly listed as unexecuted in `POSTGRES_INTEGRATION_TEST_PLAN.md`.

Final RUN 8 hardening adds terminal provider-event matrix coverage, receipt-backed evidence integrity before payment creation, durable outbox claim/lease fields, and a bounded malformed-payload policy: only a safe type/hash envelope is retained, never untrusted raw callback contents. Static checks are recorded below; PostgreSQL transaction/concurrency and browser E2E remain deliberately unexecuted on this host.

## External-case prototype completion

Implemented the bounded synthetic external-case continuation: exact buyer submission after confirmed synthetic payment; leased `GOVERNMENT_CASE_SUBMIT` delivery through the deterministic mock RTO provider; idempotent synthetic acknowledgement/reference finalization; and a separately authenticated, demo-mode-only operator simulator with server-derived event ordering, allowlisted state-dependent events, audit records, and cooldown. The operator remains excluded from all citizen participant commands.

The durable mock inbox uses a two-phase envelope/process shape and resolves a case only through its stored synthetic external reference. It models ordered inwarding, correction request/acknowledgement, approval/rejection, registry completion, withdrawal confirmation, stale/duplicate/gap/quarantined evidence, and targeted notifications. Approval never changes the synthetic ownership projection. Registry completion is the only modeled event that closes the seller interval and opens the recorded buyer interval. Citizen case views/actions remain participant-scoped; correction values are bounded synthetic fixtures and withdrawal is a request that needs mock external confirmation.

The complete Prisma baseline migration and schema contain 37 models/tables, including inbox cursor, correction, withdrawal, operator-action and outbox lease/reconciliation structures. The seed contains distinct deterministic Ananya, Rahul, and demo-operator accounts, the synthetic projection/ownership, and one synthetic service/rule; it contains no usable TOTP secret or real identifiers.

Documentation now records the current scope, malformed-envelope privacy policy, Server Action/origin/SameSite assumptions, and unexecuted PostgreSQL/browser checks. No live integration, official claim, publish, or deployment was made.

Final static verification for this documentation pass, actually run on this host:

- Prisma `validate` and `generate` with a placeholder `DATABASE_URL` — passed (Prisma Client 6.19.3).
- TypeScript `tsc --noEmit` — passed.
- ESLint over the project — passed.
- Vitest — passed: 11 files, 47 tests.
- Next production build — passed; dynamic protected routes include `/seller`, `/buyer`, `/buyer/payment`, `/case`, and `/demo/backoffice`.
- Static schema/migration parity — passed: 37 Prisma models and 37 baseline `CREATE TABLE` statements; seed contains the distinct demo operator, synthetic vehicle, and service/rule.

PostgreSQL migration deployment/seed and concurrency integration tests were not run because this host has no PostgreSQL service or Docker. Playwright/browser E2E and browser origin/cookie verification remain unexecuted because no browser runtime was installed or started.

## RUN 9 — UI/localisation accessibility foundation

Added a mobile-first shared shell with a skip link, semantic main landmark, visible locale selector, persistent allowlisted locale cookie, and matching HTML language. Central typed English/Kannada critical prototype strings have key-parity/disclosure tests. CSS adds 44px controls, robust focus, wrapping/QR-safe images, and reduced-motion handling. This is a UI foundation only; existing protected server actions and domain behavior were not changed. Full route-by-route translated copy and Playwright visual/keyboard runs remain required before localisation/accessibility completion.

RUN 9 follow-up localized the implemented home/auth/demo-helper, seller, buyer/notifications/payment, participant case, and operator backoffice surfaces through typed English/Kannada display dictionaries. It replaced raw checklist JSON and workflow/outbox/inbox labels with bounded user-facing mappings, added pending controls to the scoped mutation forms, and added actual workflow-event timestamps for the accessible case timeline. The full baseline migration was kept consistent with the new `WorkflowEvent.createdAt` field.

Final RUN 9 static verification actually run: Prisma validate/generate, TypeScript, ESLint, Vitest (19 files, 64 tests), and Next production build all passed. Static model/table parity passed at 37/37. Playwright now configures desktop, 360×800, and 320×568 projects plus a public landmark/overflow seam, but was not run: this host lacks a browser and configured seeded PostgreSQL/demo credentials. PostgreSQL deployment/seed/concurrency tests remain unexecuted for the same environment reason.

## Milestone audit and final hardening

The cost-conscious milestone audit used Luna for adversarial QA, Terra/High for security and data-integrity review, and Sol/High only for architectural judgment. Material findings were corrected: correction commands advance aggregate/workflow versions; operator bootstrap uses a separate canonical 32-byte timing-safe token; all operator simulators are demo-mode/session/role guarded; exact outbox delivery evidence gates correction and withdrawal acknowledgement; early contiguous RTO events are re-driven after matching follow-up delivery; payment callbacks start at sequence 1, defer gaps, and boundedly drain contiguous pending evidence; cross-application government-reference collisions quarantine instead of retrying; registry completion rejects dates before the current ownership interval; and acknowledgement/reference conflicts retain bounded hashes without mutating case state.

A live in-app-browser pass verified the public English/Kannada switch, persisted `html[lang=kn]`, skip-link focus transfer, and no horizontal overflow at 320px. The final static and production-build results are recorded in the final project handoff. PostgreSQL migration/seed/concurrency tests and protected golden-path browser E2E remain unexecuted because this host has no PostgreSQL/Docker or seeded disposable database.

The Sol/High final milestone review found two deterministic demo blockers and several smaller judging risks. The blockers were fixed and independently re-audited with Luna: the seller start action now resolves `KA01AB1234` by its unique registration and passes the actual seeded projection ID, while payment/submission resume links remain reachable from the buyer workspace, allowlisted participant notification, and case page after confirmed, failed, pending, or reconciliation outcomes. The seed also assigns the projection a stable ID. CI now uses its PostgreSQL service for an actual seed-to-seller-draft smoke test. Safety-critical identity disclosures, auth/seller errors, correction guidance, and seller declaration/process guidance now have English/Kannada variants, and nested page-level main landmarks were removed.

Final verification after those corrections, actually run on this host: Prisma schema validation and client generation passed; TypeScript and ESLint passed; Vitest passed 26 files / 82 tests; the Next production build passed for all implemented routes; and schema/baseline parity remains 37/37. The newly added PostgreSQL smoke test is wired into CI but could not be executed locally without PostgreSQL/Docker. Protected full-journey browser E2E and database concurrency/rollback testing remain the only material environment gaps; no live integration, publish, or deployment occurred.

## Local runtime installation and executable verification

Installed a project-local, git-ignored PostgreSQL 16.15 runtime and Playwright Chromium without requiring a machine-wide administrator install. Corrected the baseline temporal-ownership exclusion to use `tsrange`, matching Prisma's PostgreSQL `timestamp` columns, and made the Prisma seed command portable through `node --import tsx`. Added an executable PostgreSQL integration seam for overlapping ownership plus concurrent active-transfer and confirmed-payment partial uniqueness.

The first real protected browser journey exposed a rule-snapshot integrity defect: PostgreSQL JSONB key ordering caused readiness to hash differently from the application's pinned rule. Readiness now uses the shared canonical hash, with a regression test proving key-order independence. The complete synthetic Ananya seller → Rahul buyer → payment → submission → mock RTO → registry-complete journey then passed.

Final verification actually run on 2026-08-21:

- Prisma schema validation/client generation and clean migration deployment — passed.
- Deterministic seed and seed-to-seller-draft database smoke — passed.
- PostgreSQL focused integration constraints — passed.
- TypeScript and ESLint — passed.
- Vitest — passed: 26 files / 83 tests.
- Next production build — passed for all implemented routes.
- Playwright Chromium — 13 passed, 2 intentionally skipped duplicate mobile golden-path cases; desktop, 360×800, and 320×568 coverage completed.

The wider adversarial PostgreSQL callback/rollback/lockout race matrix and forged cross-origin browser test remain outstanding. No live integration, commit, push, publish, or deployment occurred.

## Citizen product shell and service catalogue

Audited the user-supplied Karnataka VAHAN Citizen Services journey with the supplied fake registration `KA049999`. The observed catalogue contains 21 entries across RC, tax/fee, vehicle, certificate and additional-service groups. The audit also captured the vehicle/RTO entry pattern, consent/security guidance, authentication-mode explanation, status/appointment/document navigation and seller-transfer verification fields. These observations are recorded in `VAHAN_SERVICE_CATALOG_AUDIT.md` as research context, not executable policy.

Rebuilt the MoveKA citizen surface around that understanding: a full landing page, synthetic vehicle entry, research-bounded service catalogue and search, 21 service-detail routes, clear working-demo versus guided-preview labels, demo account registration, redesigned sign-in/enrollment, authenticated dashboard, account/security page, responsive navigation and a persistent non-authoritative boundary. Existing seller/buyer/payment/RTO workflow behavior remains the only working transaction journey; no official document, fee, eligibility, Aadhaar, inspection or contactless rule was invented.

## UX/payment-demo correction

Added a durable one-click simulated-payment completion path for the citizen demo. It creates or confirms exactly one synthetic payment attempt, resolves any open synthetic reconciliation record, writes audit/workflow/receipt records, and leaves the submission invariant satisfied. The payment screen now exposes that single primary action rather than the legacy provider/outbox controls. The shell exposes Dashboard, Account, Switch demo account, and Sign out on mobile as well as desktop; dashboard resume links are state-aware, and seller/buyer/payment/case routes now use breadcrumbs and a four-step journey indicator. The seller sees an explicit Rahul hand-off once buyer action is required. Verification results for this correction are recorded after its actual checks run.

Final verification actually run for this correction: TypeScript and ESLint passed; Vitest passed 29 files / 96 tests; the Next production build passed; and the focused Playwright public/navigation suite passed 15/15 across desktop, 360×800, and 320×568. The previously stuck preview case was also observed after using the new path with a `CONFIRMED` synthetic payment attempt and application state `SUBMITTED`, proving the payment-to-submission invariant on the local PostgreSQL preview database.

Direct local verification for this correction: `tsc --noEmit` and ESLint completed successfully; Vitest completed 28 files / 92 tests. Prisma generation was intentionally not retried because unrelated `pnpm prisma generate` wrapper processes were already stuck on this host. No browser journey, live integration, commit, publish, or deployment was run.

Product-shell verification actually run on 2026-08-21: Prisma validation/client generation, TypeScript, ESLint, and the Next production build passed; Vitest passed 27 files / 86 tests; and the focused public Playwright suite passed all 15 checks across desktop, 360×800, and 320×568. The service category query was also exercised in the in-app browser and correctly reduced `Certificates` to its two observed catalogue entries. A separate ignored `moveka_preview` database was migrated and seeded with the deterministic fixtures, and the development server was restarted against it for review.

## Citizen journey completion and plain-language pass

Removed the hidden operator dependency from the ownership-transfer happy path. A participant-scoped demo completion service now resumes an accidental pre-dispatch withdrawal when no external case exists, dispatches the local submission boundary, applies ordered inward/approval/completion events, and changes the ownership projection only on the final completion event. Payment submission redirects directly to tracking, the buyer page has a clear post-submission action, and the exact previously stuck application was verified at `REGISTRY_UPDATE_COMPLETE` with Rahul Shetty as the current sample owner.

Reworked the citizen-facing shell, seller, buyer, payment, tracking, dashboard, account, sign-in, role chooser, home, and service catalogue copy. Internal terms such as metadata, provenance, deterministic identifiers, reconciliation, and synthetic evidence are no longer used as the main interface. Prototype disclosure is now a compact footer note, with short contextual warnings only beside authentication, payment, or simulated government processing. Technical history is collapsed by default, and the internal operator account is no longer offered in normal citizen sign-in or role selection.

Verification actually run on 2026-08-21: TypeScript and ESLint passed; Vitest passed 30 files / 98 tests; the saved PostgreSQL application reached transfer completion with the buyer as current owner; and Playwright passed 15 public/accessibility checks across desktop, 360×800, and 320×568. Three destructive golden-path variants were intentionally skipped unless `E2E_RESET_DATABASE` is explicitly set, preserving the user's preview data. No live bank, payment provider, government system, publish, or deployment was used.

## Workspace-isolated reusable demo runs

Added a forward migration and Prisma workspace/membership models. Existing rows migrate into `synthetic-workspace-default`; the seed creates its memberships. A new `DemoWorkspaceService` provisions a fresh scoped synthetic vehicle/ownership projection or transactionally resets only the current confirmed workspace with idempotency receipts and audit entries. Dashboard and citizen route/action seams resolve current workspace membership, and a pure progress model drives the four citizen journey surfaces.

Verification actually run for this slice: Prisma schema validation passed; TypeScript and ESLint passed; Vitest passed 33 files / 105 tests; Next production build passed for all 25 routes. Prisma client generation was attempted twice but Windows returned `EPERM` while replacing the already-in-use `query_engine-windows.dll.node`; the generated client nevertheless contained the new workspace types after the first attempt, allowing TypeScript verification. No migration deployment, database integration run, full database reset, browser journey, live integration, publish, or deployment occurred.

## Workspace-selection acceptance correction

Added a membership-authorized saved-workspace selector to the dashboard. It persists the selected workspace only after membership verification and resumes the selected participant's correct seller/buyer/payment/case route; Rahul can therefore discover Ananya's newly invited workspace from a separate signed-in browser. Reset now has a visible required acknowledgement, and every terminal `Start another journey` control submits the durable workspace-create action. The destructive golden-path spec was updated to create a workspace, have Rahul select that exact invited workspace, and use the current one-click simulated payment; it remains opt-in and was not run against a user database.

Verification actually run for this acceptance correction: Prisma schema validation (with a placeholder local PostgreSQL URL), TypeScript, ESLint, Vitest, and the Next production build all passed. Vitest reported 34 files / 109 tests, and the production build generated 25 route entries. The golden-path browser spec was updated but not run because it deliberately resets data only with explicit `E2E_RESET_DATABASE` opt-in.

## Notification workspace-handoff correction

Application notifications now post only an application identifier to a server action. The action resolves the buyer participant, its workspace membership, and the state-derived destination before replacing the workspace cookie; it never accepts a client-provided workspace or destination. Newly created workspace labels use a short stable reference derived from their generated ID and the selector adds a creation date. The golden-path browser spec remains opt-in and unrun here; PostgreSQL workspace integration evidence belongs to the separate externally run integration script and is not claimed as a browser run.

Verification actually run for this final QA correction: TypeScript, ESLint, Vitest, and the Next production build passed. Vitest reported 35 files / 113 tests; the production build generated 25 route entries. No browser, destructive E2E, migration deployment, or external service action was run.

## Shared citizen demo-password sign-in

Replaced normal synthetic seller/buyer enrollment, QR, and TOTP friction with a DEMO_MODE-gated shared-password sign-in (`admin` by default, optionally overridden by `DEMO_SHARED_PASSWORD`). The value is bounded and compared timing-safely, never persisted or logged; the resulting session still uses the existing opaque-session rotation/cookie path. Seller and buyer declarations now rely on their active server session while retaining participant authorization, version checks, receipts, declarations, and audit records. Legacy TOTP code remains for the separate operator bootstrap and future work, but is absent from the citizen golden path.

## Independent workspace release-gate verification

Added `prisma/workspace-integration.ts` and the `test:db-workspace` script as a durable database gate. On 2026-08-21, the complete two-migration chain and seed ran in disposable PostgreSQL schemas. The workspace test passed new-run provisioning, real seller-draft creation, reset scoping, idempotent replay, preservation of another workspace, fresh seller ownership, and demo-operator denial.

Installed the matching Playwright Chromium runtime and made the Playwright base URL/web-server command configurable so destructive tests cannot accidentally reuse the port-3000 preview. The corrected desktop golden path passed in 4.6 seconds on a disposable schema with independent seller and buyer browser contexts, including new-workspace creation, handoff, buyer workspace selection, shared-password citizen sessions, simulated payment, submission, and participant-driven completion. The disposable schema was dropped after the run.

## Shared-password and release-readiness correction

Completed the citizen shared-password path with `admin` as the demo default and an optional `DEMO_SHARED_PASSWORD` override. Citizen sign-in is restricted to the fixed Ananya/Rahul allowlist, the bounded password is compared through fixed-length SHA-256 digests with `timingSafeEqual`, and successful access rotates the existing opaque database session. Authenticator controls were removed from citizen sign-in, seller confirmation, buyer acceptance, and account status; the separate legacy internal-operator credential path was not exposed through citizen sign-in.

Corrected the seller dashboard handoff so “Switch to Rahul’s demo account” opens the role switcher instead of the case tracker. Reworked dashboard reset, saved-journey, outcome, seller/buyer confirmation, case, and service-detail copy to remove implementation terms from the citizen surface while preserving compact prototype/government-boundary disclosures. The local default workspace is now labelled “Ownership transfer demo.”

Added `prisma.config.ts`, Node 24 environment-loading scripts, explicit CI demo-password configuration, `vercel.json`, an automated Vercel build pipeline (generate, migrate, idempotent seed, build), and `docs/DEPLOYMENT.md`. The deployment remains intentionally fictional and requires a dedicated PostgreSQL database plus runtime secrets.

Final verification actually run: Prisma client generation and schema validation passed; TypeScript and ESLint passed; Vitest passed 36 files / 118 tests; and the Next.js production build passed with 25 routes. On a disposable PostgreSQL schema, the independent seller/buyer shared-password golden path passed in 4.7 seconds. A separate public browser matrix passed all 15 checks across desktop, 360×800, and 320×568. The disposable release schema was then dropped; no preview or external database was used by the destructive browser reset.

Final static verification after these additions passed: Prisma validation and client generation, TypeScript, ESLint, Vitest (35 files / 113 tests), and the Next production build (25 route entries). A pre-migration custom-format dump of the local preview was created under the ignored `.local-tools/backups` directory; the verified workspace migration was then deployed to `moveka_preview`, migration status reported up to date, Prisma generation succeeded, and the port-3000 preview restarted successfully. A live in-app-browser smoke check confirmed the signed-in dashboard renders the saved-workspace selector, current completed journey, direct new-journey action, and required reset acknowledgement. No Git commit, push, publish, Vercel deployment, bank/provider call, or government-system call occurred.

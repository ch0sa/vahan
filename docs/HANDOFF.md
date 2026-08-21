# MoveKA project handoff

Last updated: 21 August 2026
Handoff baseline: Git commit `f2372483bc90bef073e2ffb52ee92d1f0f90fe21`

## 1. Start here

MoveKA is a fictional, citizen-facing vehicle ownership-transfer prototype for the Build for India hackathon. It is not a government service and must never be presented as connected to VAHAN, Sarathi, an RTO, Aadhaar, a bank, a payment provider, or a vehicle registry.

The project has a real database-backed orchestration model and one synthetic seller-to-buyer journey, but it is not a finished product. The owner has reported that the live product is still buggy and confusing. Green automated checks prove specific engineering paths, not overall usability or production readiness.

Read these files in this order:

1. `docs/BUILD_FOR_INDIA_PROJECT_OVERVIEW.md` — product, hackathon story, scope and gaps.
2. `README.md` — current implemented surface and commands.
3. `docs/DEMO_SCOPE.md` — strict mock/live boundary.
4. `docs/CURRENT_SYSTEM_AUDIT.md` and `docs/VAHAN_SERVICE_CATALOG_AUDIT.md` — research inputs.
5. `docs/ARCHITECTURE.md`, `docs/DOMAIN_MODEL.md`, `docs/WORKFLOW_STATE_MACHINE.md` and `docs/SERVICE_BOUNDARIES.md` — approved design.
6. `docs/ACCEPTANCE_TESTS.md`, `docs/THREAT_MODEL.md` and `docs/POSTGRES_INTEGRATION_TEST_PLAN.md` — verification and outstanding risk.
7. `AGENTS.md` — repository rules for future coding agents.

`docs/CODEX_CONTRIBUTION.md` is a chronological engineering log. Older entries describe intermediate states and may be obsolete. Current code, migrations, `README.md`, `DEMO_SCOPE.md`, this handoff and the latest Git history take precedence. In particular, older audit sections discussing citizen TOTP predate the current shared demo password.

## 2. Repository and live services

| Item | Current value |
|---|---|
| GitHub | `https://github.com/ch0sa/vahan` |
| Repository visibility | Private |
| Default branch | `main` |
| Handoff commit | `f2372483bc90bef073e2ffb52ee92d1f0f90fe21` |
| Merged release PR | `https://github.com/ch0sa/vahan/pull/1` |
| Production | `https://moveka.vercel.app` |
| Vercel project | `chosas-projects/moveka` |
| Production database | Neon resource `moveka-postgres`, free plan, Singapore |
| Function region | Vercel `sin1` |
| Demo password | `admin` while `DEMO_MODE=true` |

The archive accompanying this handoff contains source code only. It intentionally excludes `.git`, `.env.local`, Vercel credentials, database credentials, `node_modules`, `.next`, local PostgreSQL, Playwright browsers, logs, reports and caches.

Anyone taking over the hosted project needs access to the owner's GitHub and Vercel team, or must provision their own Vercel project and PostgreSQL database. Do not copy production secrets into chat, documentation or source control.

## 3. What currently works

- Public landing page, synthetic registration lookup and a searchable catalogue of 21 researched Karnataka VAHAN services.
- Detail pages for all catalogue entries. Only ownership transfer is an interactive transaction; most entries are guided previews.
- Fixed fictional citizens: Ananya Rao (seller) and Rahul Shetty (buyer).
- Shared-password demo access with opaque, database-backed sessions.
- Dashboard, account page, saved demo workspaces, new-journey creation and selected-workspace reset.
- Seller draft, readiness check, declaration and buyer invitation.
- Buyer workspace selection, review, declaration and acceptance.
- One-click fictional payment that collects no financial data and moves no money.
- Buyer submission, case tracking and participant-triggered simulation of external inwarding, approval and registry completion.
- A separate guarded internal simulator for correction, rejection, withdrawal and event-ordering research.
- PostgreSQL migrations, deterministic seed, participant authorization, aggregate versions, idempotency receipts, workflow/audit events, inbox/outbox records and temporal ownership history.
- English/Kannada infrastructure, mobile layouts, skip link and a limited automated accessibility matrix.
- Production deployment on Vercel with a dedicated Neon database.

Latest recorded verification before this handoff:

- GitHub CI passed locked dependency install, Prisma generation/validation, both migrations, seed, PostgreSQL smoke test, TypeScript, ESLint, Vitest and Next.js production build.
- Vitest previously reported 36 files and 118 tests.
- A disposable-database desktop Playwright golden path passed with separate seller and buyer contexts.
- Fifteen public Playwright checks passed across desktop, 360×800 and 320×568.
- Production `/`, `/services` and `/auth/sign-in` returned HTTP 200.

Do not rewrite these statements as “production tested.” The production golden path was not destructively rerun after deployment, and the user has subsequently reported real usability defects.

## 4. Most important unresolved problem

The public demo does not have true visitor isolation.

Every visitor signs in as the same Ananya or Rahul database user. Workspaces are membership-isolated between those two database identities, but all real visitors share those identities. This means one visitor can encounter journeys created or completed by another visitor, saved-workspace lists can grow and become confusing, and a visitor may reset or continue a shared demo workspace. This likely contributes to reports of arriving at an already-completed transfer and being unable to start cleanly.

Treat this as the first release-blocking product defect.

Recommended fix:

1. Add a `DemoInstance` or tenant/claim identifier generated when a visitor starts a demo.
2. Create a fresh fictional seller/buyer pair or instance-scoped participant identities for that demo.
3. Give the seller a buyer handoff link or short claim code that can be opened in another browser/private window.
4. Scope every workspace, session, participant query, notification and reset to the demo instance.
5. Expire and purge abandoned demo instances safely.
6. Add two-parallel-visitor E2E tests proving neither visitor can see or mutate the other's journey.

Until that is implemented, describe the public deployment as an early shared prototype, not a production-ready public service.

## 5. Prioritized backlog

### P0 — make the demo reliably startable and finishable

- Reproduce every user-reported broken path on `https://moveka.vercel.app` and record exact URL, role, workspace, state and action.
- Implement per-visitor demo isolation as described above.
- Replace the current reset/start-new model with one obvious `Start a fresh demo` action that always produces a clean isolated journey.
- Ensure the seller handoff produces a buyer link/code and does not require repeatedly switching a single browser session.
- Prove the complete path from a fresh public landing page to completion in two independent contexts, then leave the test environment clean.
- Fix progress calculation so it reflects the participant's actual action, not merely the aggregate's coarse state.
- Add safe recovery for stale cookies, deleted workspaces, invalid workspace selection and terminal journeys.

### P1 — redesign the experience around the hackathon problem

- Narrow the product story to one problem: coordinating and tracking a normal private-vehicle sale between seller and buyer while preserving the external RTO boundary.
- Replace `/auth/register`, which is currently a role chooser rather than real registration, with honest wording and a clearer start flow.
- Allow users to create fictional names, contact aliases and vehicle details inside an isolated demo. Never solicit real data.
- Convert the journey into short, question-led screens with one primary action and a persistent plain-language `What happens next?` summary.
- Show seller and buyer responsibilities separately while keeping a shared progress view.
- Replace the participant-driven `Complete demo journey` shortcut with an explicit sequence of clearly labelled simulated external updates. It may stay mocked, but it should demonstrate the real hand-off concept rather than appear magical.
- Remove internal/admin concepts from citizen navigation. Keep technical event history collapsed or in a separate developer mode.
- Audit every English hard-coded string. The current home page and other newer UI sections are not fully translated even though locale infrastructure exists.
- Add understandable empty, error, retry, offline, timeout and resume states.
- Verify all controls at 320px, 360px, keyboard-only and with a screen reader; automated DOM checks are not enough.

### P1 — strengthen the engineering evidence

- Complete the outstanding concurrent command, callback, rollback, lockout and external-event tests listed in `POSTGRES_INTEGRATION_TEST_PLAN.md`.
- Add a non-destructive production-like E2E environment using a separate Neon branch/database. Preview deployments intentionally do not use Production PostgreSQL today.
- Test two unrelated demo visitors concurrently, two tabs for one participant, refresh during each mutation and retry after simulated network failure.
- Add a forged cross-origin Server Action test and a dedicated audit proving raw external payloads/internal enums are not rendered.
- Review compressed one-line route components and split them into maintainable, testable UI components.
- Reassess test quality: several tests are useful policy/string guards, but the count of 118 should not be mistaken for 118 full behavioral scenarios.

### P2 — hackathon and operational polish

- Create a two-to-three-minute demo script and a fresh seeded judging environment.
- Add a concise architecture/process visual showing citizen orchestration around external government systems.
- Add product analytics that collect no sensitive data: start rate, successful seller handoff, buyer continuation, completion and abandonment step.
- Add error monitoring, structured redacted logs, health checks, backup/restore rehearsal and deployment rollback instructions.
- Decide whether the GitHub repository must be public for judging; it is currently private.
- Configure a custom domain only if needed.

## 6. Confirmed prototype limitations

- No real sign-up, identity proof, mobile OTP, Aadhaar, registered-owner validation or account recovery.
- The two citizen accounts and the sample vehicle are fixed fixtures.
- The registration-number box does not query a registry and should not imply that arbitrary registrations work.
- No real document upload, document validation, e-sign, storage or malware scanning.
- No official forms, state-specific eligibility engine, fee calculation, appointment booking or legally authoritative checklist.
- Payment is one local database action. There is no Razorpay/bank order, checkout, callback, refund or settlement.
- Government/RTO processing is simulated locally. The citizen completion action can advance several mock events.
- In-app notification persistence exists, but the adapter's external delivery method is a no-op. There is no SMS, email, WhatsApp or push notification.
- Twenty catalogue services are informational previews rather than executable workflows.
- Kannada coverage is incomplete in newer hard-coded UI copy.
- No offline/PWA mode or demonstrated slow-network recovery.
- No custom CSRF-token design; the prototype relies on Next Server Action origin checks, SameSite cookies and server authorization.
- No production-grade rate limiting, key management, retention policy, privacy workflow, DSR process, document security or formal penetration test.
- No official integration contracts or permission to access government systems.
- Preview deployments have no database by design and may fail until a separate preview database/branch is configured.

## 7. Technology and repository map

### Main stack

- Next.js 16 App Router and React 19
- TypeScript 5.9
- PostgreSQL and Prisma 6
- Zod validation
- Vitest, Playwright and ESLint
- pnpm 11.19 and Node.js 24
- Vercel Functions and Neon PostgreSQL

### Important directories

- `app/` — pages, Server Actions and shared UI.
- `src/domain/` — workflow, payment, seller/buyer, external-case and workspace behavior.
- `src/identity/` — sessions, shared demo-password gate and legacy operator TOTP.
- `src/workspace/` — selected-workspace resolution and safe navigation.
- `src/adapters/` — mock ports/adapters.
- `prisma/schema.prisma` — 39 current models and 9 enums.
- `prisma/migrations/` — baseline plus workspace-isolation migration.
- `prisma/seed.ts` — deterministic fictional fixtures.
- `prisma/*.ts` integration scripts — database smoke/constraint/workspace checks.
- `e2e/` — public accessibility/shell and opt-in destructive golden path.
- `docs/` — research, architecture, boundaries, tests, deployment and this handoff.
- `.codex/agents/` — optional specialist-agent definitions; they are not runtime dependencies.

## 8. Local setup from the archive

Prerequisites:

- Node.js 24.x
- pnpm 11.19.0
- PostgreSQL 16 or a compatible disposable PostgreSQL database
- Git, if the recipient wants to reconnect to GitHub

PowerShell setup:

```powershell
Copy-Item .env.example .env.local

# Edit DATABASE_URL for your own local/disposable PostgreSQL database.
# Generate a session key and paste it into SESSION_HASH_KEY in .env.local.
[Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))

pnpm install --frozen-lockfile
pnpm prisma:generate
pnpm prisma:migrate:deploy
pnpm db:seed
pnpm dev
```

Open `http://localhost:3000`.

Demo accounts:

- Ananya Rao — seller
- Rahul Shetty — buyer
- Shared demo password — `admin`
- Sample vehicle — `KA01AB1234`

Use a normal browser context for one participant and a private/incognito context for the other. Do not enter real personal, vehicle or financial data.

## 9. Verification commands

Static verification:

```powershell
pnpm verify
```

Database checks require a disposable database:

```powershell
pnpm prisma:migrate:deploy
pnpm db:seed
pnpm test:db-smoke
pnpm test:db-integration
pnpm test:db-workspace
```

Public E2E checks:

```powershell
pnpm exec playwright install chromium
pnpm test:e2e
```

The golden-path test deletes applications and related fictional records. Run it only against a disposable database/schema and opt in explicitly:

```powershell
$env:E2E_RESET_DATABASE = "1"
pnpm exec playwright test e2e/golden-path.spec.ts --project=desktop
```

Never set `E2E_RESET_DATABASE=1` while `DATABASE_URL` points to production or a database containing anything that must be preserved.

## 10. Deployment

Required Production environment variables:

```text
DATABASE_URL=<pooled PostgreSQL URL>
DATABASE_URL_UNPOOLED=<direct PostgreSQL URL for migrations, when available>
DEMO_MODE=true
DEMO_SHARED_PASSWORD=admin
SESSION_HASH_KEY=<random base64 32-byte secret>
```

`pnpm vercel-build` generates Prisma Client, applies committed migrations, runs the idempotent seed and builds Next.js. `vercel.json` pins functions to `sin1`; `.vercelignore` prevents local dependencies and tools from being uploaded.

Production is public. Vercel's account-only SSO protection was disabled. Production secrets exist only in Vercel and are not included in the archive.

Do not connect Preview deployments to Production PostgreSQL. Provision a separate preview database or Neon branch before enabling PR previews.

## 11. Safe scaling path

The modular-monolith/state-machine direction is reusable, but the demo authentication and adapters are not.

Before real-world use:

1. Obtain formal legal, privacy, security and government-integration approval.
2. Replace shared demo identities with production identity proofing and consent.
3. Integrate only documented, authorized VAHAN/RTO interfaces; never screen-scrape or invent private APIs.
4. Replace the local payment simulator with a PCI-minimizing provider adapter. The server should create provider orders, verify signed callbacks, preserve idempotency and reconcile ambiguous outcomes. Razorpay or another provider can be chosen later without changing the citizen state model.
5. Add encrypted object storage, upload scanning, retention/deletion policy and authorized document access.
6. Run asynchronous inbox/outbox workers outside request paths, with dead-letter handling and operator reconciliation.
7. Add real notification providers without making delivery the source of workflow truth.
8. Add tenant isolation, rate limiting, KMS-managed secrets, least-privilege database roles, observability, backups and incident response.
9. Validate official state-specific forms, rules, fees, timelines and physical-visit requirements with authoritative owners before encoding them.

## 12. Handoff definition of done for the next maintainer

The next milestone should not be “add more services.” It should be:

> Two unrelated visitors can each start a fresh fictional ownership-transfer demo, hand it to their own buyer in another browser, complete every step without confusion, refresh/resume safely, and never see or change the other visitor's data.

Only after that milestone is demonstrably reliable should the team add custom fictional profiles, richer RTO-process simulation, additional services or real integration planning.

# MoveKA

MoveKA is an independent, synthetic transport-workflow prototype. It does not connect to, replace, or control VAHAN, Sarathi, an RTO, a government identity system, a bank, or a vehicle registry. Every person, vehicle, payment, external reference, event, and result is deterministic synthetic data.

## Current prototype scope

The public product surface now includes a full landing page, synthetic vehicle lookup, searchable 21-service catalogue, individual service overviews, simple demo-account sign-in, and protected dashboard/account pages. The catalogue is a dated research snapshot of the Karnataka VAHAN Citizen Services portal, not an authoritative list of current eligibility, documents, fees, authentication modes, or processing requirements. Seller/buyer ownership transfer is the only end-to-end working citizen journey; withdrawal is available within an active case, and every other catalogue item is explicitly labelled as a guided preview.

The protected prototype supports the Ananya-to-Rahul journey for sample vehicle `KA01AB1234`: shared-password demo sign-in; seller confirmation; buyer review; a one-click demo payment that moves no money; submission; progress tracking; and a completed ownership-transfer result. Citizens can finish the happy path from the tracking page without an operator console. A protected internal demo console remains available for testing exceptional events, but it is not part of the citizen journey and is not an RTO/officer portal.

The citizen payment step is deliberately fake for the current prototype. It creates local synthetic payment/attempt/audit records and immediately unlocks submission; it does not load a payment SDK, create a provider order, call a bank, accept card/UPI details, or receive a provider webhook. The older mock outbox/event/reconciliation structures remain isolated research scaffolding for a possible later provider integration and are not required to complete the demo.

Citizen demo sign-in uses only the selected synthetic seller/buyer account plus the shared local demo password (`admin` by default while `DEMO_MODE=true`). This is a convenience gate, not real authentication; never reuse a real password. It still creates the existing opaque, rotating server session. The internal operator remains separate and is not available through citizen sign-in.

The ordered mock inbox supports inwarding, targeted correction request/acknowledgement, approval/rejection, registry-update completion, and the withdrawal boundary. Approval does not change the local synthetic ownership projection. Only a matching synthetic registry-update-completed event may close the seeded seller ownership interval and open the distinct buyer interval. A withdrawal request is only a mock external request; only matching mock external confirmation reaches the withdrawn state.

No real identity proof, payment details, documents, fees, eligibility, RTO acknowledgement, approval, registry update, or ownership transfer is claimed. There are no live SDKs or integrations.

## Reusable demo workspaces

Each synthetic run is isolated in a member-scoped workspace. The dashboard lists only the participant's workspace applications. A citizen can start a new isolated demo journey or explicitly reset the selected workspace; reset recreates only its deterministic vehicle and journey data, never the entire database or another workspace.

The dashboard's saved-workspace selector is membership-checked on submission before it reads a journey. This lets Rahul select a workspace that Ananya has just invited him into, even in a separate signed-in browser, without exposing any unrelated workspace. Reset requires a visible acknowledgement and terminal journeys create a new workspace directly rather than silently returning to the dashboard.

## Safety and configuration

Set a base64-encoded 32-byte `SESSION_HASH_KEY`; never commit it. The two citizen fixtures use `DEMO_SHARED_PASSWORD` (`admin` by default) only while `DEMO_MODE=true`, and successful sign-in creates the existing opaque server session. `TOTP_ENCRYPTION_KEY` is retained only for the separate legacy operator-enrollment path. Session cookies are HttpOnly, SameSite, and Secure where applicable.

`DEMO_OPERATOR_BOOTSTRAP_TOKEN` is a separate canonical base64 32-byte local-only bootstrap secret. It is required to begin initial operator enrollment, is compared timing-safely, and is never stored or logged. It does not reset an enrolled operator credential.

Demo-only pages/actions fail closed unless `DEMO_MODE=true`. Server mutations validate the active session, role, participant/object scope, idempotency key, expected aggregate version, and applicable cooldown. Next Server Actions rely on framework same-origin/origin checks; this project does not claim a custom CSRF token.

Malformed mock payment/RTO callbacks retain only a bounded allowlisted metadata envelope and hash, never their raw input, to limit accidental secret retention.

## Commands

```powershell
pnpm install
pnpm verify
```

The scripts use Node.js 24 and load `.env.local` when it exists. Copy `.env.example` to `.env.local`, configure the local PostgreSQL URL and session key, and keep the file uncommitted.

Prisma migration, seed, and integration checks require a disposable PostgreSQL instance; see `docs/POSTGRES_INTEGRATION_TEST_PLAN.md` for executed and remaining coverage.

For deployment, use a dedicated PostgreSQL database and configure `DATABASE_URL`, `DEMO_MODE=true`, `DEMO_SHARED_PASSWORD`, and a random base64 32-byte `SESSION_HASH_KEY`. Apply `prisma migrate deploy` and the idempotent deterministic seed before opening the deployment. Do not configure real citizen, vehicle, payment, document, or government data. The public shared password is intentionally suitable only for this fictional hackathon demo.

The repository includes a Vercel build command that generates Prisma Client, applies committed migrations, runs the idempotent sample seed, and builds Next.js. See `docs/DEPLOYMENT.md` for the release sequence and required environment variables.

This workspace now has an ignored project-local PostgreSQL 16.15 installation in `.local-tools/pgsql` and Playwright Chromium. The migration chain, deterministic seed, database smoke, PostgreSQL exclusion/partial-unique checks, workspace-isolation integration test, and protected browser journey have all run locally. Use `pnpm test:db-integration` for focused database constraints and `pnpm test:db-workspace` for reusable-run/reset isolation; both require a disposable database or schema. Remaining adversarial transaction scenarios are tracked in `docs/POSTGRES_INTEGRATION_TEST_PLAN.md`.

The Playwright configuration includes desktop and 320/360px projects. The destructive database-reset journey now requires explicit `E2E_RESET_DATABASE` opt-in; public accessibility, persistent Kannada locale, protected-route denial, disclosure, and overflow checks run at all three viewport sizes.

Latest release verification: Prisma generate/validate, TypeScript, ESLint, 118 Vitest tests, and the production build passed. The shared-password seller-to-buyer golden path passed on a disposable PostgreSQL schema, and 15 public browser checks passed across desktop, 360px, and 320px viewports.

Useful entry points while the development server is running:

- `/` — citizen landing page and synthetic vehicle lookup
- `/services` — searchable service catalogue
- `/demo-helper` — deterministic seller/buyer demo-account selection
- `/auth/sign-in` — prototype sign-in
- `/dashboard` — signed-in case and vehicle overview
- `/account` — signed-in profile, security, and privacy information

CI provisions PostgreSQL, deploys the baseline migration, seeds the deterministic fixtures, and runs `pnpm test:db-smoke`; that smoke creates and reloads the first seller draft, specifically protecting the seed-to-domain contract.

## Contributing and reuse

MoveKA is open source under the MIT License and is intended to improve through collaboration. Anyone may build on it within the terms of `LICENSE`. Contributions are welcome, especially fixes for the release blockers and usability gaps listed in `docs/HANDOFF.md`. Please read `CONTRIBUTING.md` before proposing a change and preserve the prototype's synthetic-data, independent-product, and no-live-government-integration boundaries.

The Build What Moves India FAQ says builders retain full rights to their builds. This project therefore makes its independently created source available for reuse and improvement under the MIT License. Third-party dependencies and assets remain subject to their own licences.

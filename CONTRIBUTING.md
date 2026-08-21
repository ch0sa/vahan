# Contributing to MoveKA

MoveKA welcomes improvements from designers, developers, testers, product thinkers, and public-service experts. The most useful starting point is `docs/HANDOFF.md`, which records the current release state, known defects, verification commands, and prioritized backlog.

## Product boundary

Keep MoveKA an independent hackathon prototype. It must not claim to be an official government service or to control VAHAN, Sarathi, an RTO, a bank, an identity provider, or a vehicle registry.

- Use fictional or deterministic synthetic data only.
- Do not add real Aadhaar, PAN, passwords, OTPs, payment details, or personal vehicle information.
- Do not connect to live government systems or undocumented APIs.
- Do not invent legal requirements, fees, eligibility rules, processing times, or internal RTO behaviour.
- Label simulations and unresolved assumptions honestly without cluttering the citizen journey.

## Where help is most valuable

Prioritize the open P0 and P1 work in `docs/HANDOFF.md`, particularly visitor-isolated demo identities, reliable fresh-start/reset behaviour, one complete seller-to-buyer journey, mobile usability, accessibility, and honest verification. Avoid broadening the prototype into unrelated transport services until the ownership-transfer journey is dependable.

## Development workflow

1. Create a focused branch from `main`.
2. Keep the change small and update or add tests with it.
3. Run `pnpm verify` before opening a pull request.
4. Run the relevant database or Playwright checks described in `docs/HANDOFF.md` when the change affects persistence or the citizen journey.
5. Explain what changed, why it helps citizens, what was tested, and what remains mocked.

Never commit `.env`, `.env.local`, databases, authentication secrets, generated build output, dependency folders, or real personal data.

## Licence

MoveKA is distributed under the MIT License. By contributing, you agree that your contribution may be distributed under that licence. Third-party dependencies and assets remain subject to their own licences.

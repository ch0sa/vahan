# Project documentation

RUN 1 produced the following reviewed project baselines:

- ARCHITECTURE.md
- DOMAIN_MODEL.md
- WORKFLOW_STATE_MACHINE.md
- SERVICE_BOUNDARIES.md
- ACCEPTANCE_TESTS.md
- DEMO_SCOPE.md
- CODEX_CONTRIBUTION.md

`CURRENT_SYSTEM_AUDIT.md` remains the factual source input. The other documents are the consolidated architecture and verification baseline for subsequent bounded implementation tasks.

The current prototype implements the complete bounded synthetic journey: seller-to-buyer handoff, server-owned mock payment and reconciliation, buyer submission, leased mock government-case delivery, ordered RTO-event simulation, correction and withdrawal recovery, approval/rejection, and registry-completion-only mutation of synthetic ownership intervals. It does not verify government identity, collect real documents/payment details, perform official RTO work, or call any live external service.

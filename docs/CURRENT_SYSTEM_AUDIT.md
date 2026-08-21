# CURRENT_SYSTEM_AUDIT.md
## Karnataka Transport / VAHAN / Sarathi — Forensic Product & Process Audit

### 1. Purpose of this audit

This audit defines the factual operating boundaries for an independent Build What Moves India prototype that improves access to Karnataka transport services.

The project must **not** redesign statutory RTO decision-making, change legal requirements, invent faster approval processes, or pretend existing government infrastructure can be replaced.

Instead, the prototype should redesign:

- service discovery;
- citizen accounts;
- eligibility/readiness guidance;
- data collection;
- document preparation;
- multi-party coordination;
- authentication UX;
- payments UX;
- status communication;
- error recovery;
- application resumption;
- notifications;
- accessibility;
- localisation;
- reliability around existing external processes.

The RTO, VAHAN, Sarathi, government identity systems, banks/payment services, financiers and physical inspection processes remain external authorities.

The hackathon explicitly requires a working end-to-end prototype, asks builders to think beyond interface design into backend/infrastructure/process, and simultaneously prohibits accessing/testing live government systems or using undocumented private APIs. Therefore all such external integrations in this project must be synthetic adapters or simulators.

---

# 2. What the present ecosystem actually looks like

There is not one single "Karnataka Transport website."

The citizen experience is split across several systems.

| Layer | Current role |
|---|---|
| Karnataka Transport Department site | Information, procedures and links into transactional systems |
| VAHAN Citizen Services | Vehicle registration/RC/tax/fitness/NOC/hypothecation and related transactions |
| Sarathi | Learner's licence, driving licence and related driver services |
| Permit systems | Permit-specific services/status |
| Payment systems/banks | Fee and tax transactions |
| RTO/ARTO offices | Statutory scrutiny, approval, correction, physical verification and exception handling where applicable |
| Dealers | Certain registration processes |
| Fitness/inspection infrastructure | Physical vehicle testing where legally required |
| Postal/physical delivery infrastructure | Used in services where physical documents are dispatched |

Karnataka's own Services page separately lists Sarathi and VAHAN services. VAHAN services include temporary registration, new registration, ownership transfer, RC address changes, NOC, B-Extract, tax, alteration, fitness and RC renewal. It even distinguishes an RTO-based B-Extract from a version available entirely online.

Karnataka's Contactless Services catalogue is broader still. Its VAHAN section includes ownership transfer, duplicate RC, hypothecation, NOC, B-Extract and commercial permit services, while the Sarathi section includes DL renewal, duplicate DL, DL address/name changes and IDP services.

**Product implication:** fragmentation is part of the problem. Citizens are currently expected to understand which administrative system owns their need.

Our redesign should hide that complexity without pretending those systems have been merged.

---

# 3. Critical distinction: computerised does not mean automated

VAHAN is intended to computerise RTO processes for registration, fitness, taxes, permits and enforcement. That does not mean every decision is automatically made by software.

The current VAHAN citizen portal explicitly explains that:

- authentication modes depend on directions from the relevant state;
- some services may use Aadhaar authentication;
- contactless/eKYC services can avoid an RTO visit for verification of uploaded documents;
- non-contactless services still require an RTO visit for verification of documents and, where required, the vehicle;
- fitness and alteration are examples of services that can remain non-contactless.

Therefore our architecture must distinguish between:

**Digital submission**
and

**automatic government approval**.

They are not the same thing.

---

# 4. Ownership Transfer — current legal foundation

For a normal sale, official Parivahan guidance describes two distinct parties.

The **transferor/seller** reports the transfer through Form 29.

For a vehicle registered in the same state, the **transferee/buyer** applies through Form 30 within 14 days of transfer.

The official guidance also identifies documents including registration certificate and insurance, with PUC, PAN/Form 60, address proof and other material potentially required depending on the state/case. Different procedures exist for death of an owner and public auction.

Therefore:

**Seller → Buyer is not something we invented for UX purposes.**

It reflects the underlying transaction.

Our new interface must preserve this fundamental division.

---

# 5. Current normal-sale ownership-transfer journey

The public official pages do not expose every internal Karnataka RTO screen or officer-routing step. We should not invent that information.

However, the public citizen journey and system boundaries are sufficiently visible to reconstruct the important architecture.

## Stage A — Service discovery

The citizen can encounter ownership transfer from the Karnataka Transport Department website and ultimately enter VAHAN.

Karnataka lists Transfer of Ownership both as a VAHAN service and under Contactless Services.

There is an immediate documentation problem: on the current Karnataka Contactless Services page, the row for **Transfer of Ownership of Motor Vehicle has no procedure or video linked**, despite surrounding services having them.

### Our improvement

The user should never have to find a PDF/manual before beginning.

The application determines the appropriate journey interactively.

---

## Stage B — Identifying the vehicle/service context

VAHAN's citizen-services entry currently offers access by:

- registration number; or
- registering authority.

The portal reports different numbers of enabled services depending on state; Karnataka currently appears with 18 services in that selector.

Authentication and available functionality can subsequently depend on state configuration.

### Our improvement

Once a synthetic citizen account has been verified, their synthetic vehicles appear automatically on a dashboard.

The citizen starts with:

**My vehicle → What would you like to do?**

not:

**Choose government transaction → enter vehicle identifiers again.**

Production integration would still query the authoritative registry through an approved interface.

---

## Stage C — Seller initiates

Current VAHAN explicitly states:

**Transfer of Ownership must first be initiated by the seller; the buyer then continues it.**

This instruction is repeated across multiple VAHAN service surfaces. A dedicated **eSign By Seller** capability also exists.

### Preserve

Seller initiation.

Seller declaration/consent.

Any legally required signature/e-sign mechanism.

### Improve

Explain this immediately:

**Step 1 of 2 — Seller**

**Your buyer cannot continue until you complete this part.**

No government jargon required.

---

## Stage D — Authentication / identity

VAHAN's current authentication mode is not universally fixed. The portal says authentication modes are enabled or disabled based on the respective state's directions and may involve Aadhaar authentication.

VAHAN also maintains a citizen account mechanism. Its user registration form currently uses the citizen's mobile number as the login ID.

At the same time, many individual functions still ask citizens for transaction-specific identifiers such as registration number, chassis digits and application number.

### Our prototype

Authentication is represented through an abstraction:

`IdentityVerificationProvider`

The hackathon implementation uses a genuine standards-based **TOTP authenticator**.

The prototype must never claim TOTP verifies ownership of the mobile number registered with VAHAN.

It verifies the user's **prototype account only**.

A future authorised deployment could replace:

`DemoTotpProvider`

with:

`GovernmentApprovedOtpProvider`

or another identity mechanism without rewriting the citizen workflow.

---

# 6. TOTP design

Each seeded synthetic user gets a demo account.

Example:

**Ananya Rao — Seller**

At first setup:

1. Application creates a TOTP secret.
2. Browser displays a QR code.
3. User scans it with an authenticator application.
4. Authenticator generates the rolling code.
5. Server verifies the code cryptographically.
6. Account becomes verified.

This means the prototype authentication genuinely works.

It is **not** a fake text field containing a hard-coded `123456`.

Nevertheless it must be labelled:

**Prototype authentication — does not authenticate against VAHAN, Aadhaar or the Karnataka Transport Department.**

The hackathon specifically permits simulated OTPs and synthetic identity flows.

---

# 7. Buyer handoff

The existing system requires the seller to initiate before the buyer continues.

Current VAHAN pages relating to buyer information can require:

- application number;
- registration number;
- last five chassis characters;
- buyer mobile number;
- OTP generation.

This exposes a major experience flaw:

**the citizen carries the database's identifiers between steps.**

### Our improvement

The application performs the exact same logical handoff but removes identifier burden.

Seller completes their part.

The application's database creates:

`TransferCase`

with two participants:

`SELLER`
`BUYER`

The buyer receives a prototype in-app notification/deep link.

When the buyer signs in, they see:

> Action required
> Ananya has initiated transfer of KA01AB1234 to you.

The buyer should not manually re-enter:
- application number;
- registration number;
- seller details;
- previously known vehicle information.

Those relationships already exist in the application state.

---

# 8. Documents

Current VAHAN instructions say the generic online procedure consists of selecting the application, entering details and paying, after which documents can be uploaded and appointments booked as required by the receipt.

Official transfer guidance identifies Forms 29 and 30 and supporting documentation; some additional documents are explicitly state-dependent.

### Important constraint

We must not decide that a legally required document is unnecessary simply because it makes our interface cleaner.

Instead the redesign improves **understanding**.

A requirement should be represented as structured data:

`DocumentRequirement`

with:

- applicable service;
- applicable vehicle class;
- applicable participant;
- reason;
- source/rule version;
- required/conditional;
- received/not received;
- external-verification status.

The UI then explains:

> **Address proof — Buyer**
>
> Required to establish the buyer's registered address.

rather than dumping a list of form numbers.

---

# 9. Contactless versus non-contactless

This is extremely important.

VAHAN says contactless/eKYC services using Aadhaar authentication can remove the requirement to visit the RTO **for verification of uploaded documents**.

It separately says non-contactless transactions require an RTO visit after submission/payment/upload and may also require the vehicle.

VAHAN additionally says that when a user combines faceless and non-faceless services, the combined application can become non-faceless.

### Therefore our rules engine needs:

`processingMode`

with conceptual values such as:

`CONTACTLESS`
`RTO_VISIT_REQUIRED`
`PHYSICAL_VEHICLE_REQUIRED`

But the prototype must derive those states from synthetic rules matching our chosen scenario.

It must not claim to know live Karnataka eligibility from VAHAN.

---

# 10. Payment

VAHAN already supports online fee/tax payments.

It also exposes an important operational failure condition: a previous bank transaction can remain pending and block a new application/payment until the transaction is re-verified or cleared.

This is a good example of where reliability design matters.

### Our prototype must model:

`PAYMENT_CREATED`
`PAYMENT_PENDING`
`PAYMENT_CONFIRMED`
`PAYMENT_FAILED`
`PAYMENT_RECONCILIATION_REQUIRED`

A payment becoming pending must **not lose the application**.

Closing the browser must **not require beginning again**.

Duplicate callbacks must **not charge or advance the workflow twice**.

The demo payment remains synthetic.

Actual fees must not be represented as authoritative current Karnataka charges.

---

# 11. Inwarding into RTO

A very useful boundary appears in VAHAN's withdrawal system.

Before an application is inwarded at the RTO, certain withdrawals can be completed online.

Once the application has already been **inwarded at the RTO**, VAHAN tells the citizen that they must visit the RTO to withdraw it.

It also states that after the application reaches the payment phase, an RTO visit may be required for withdrawal.

This establishes a clear architectural handover:

**Citizen-facing transaction → RTO-controlled case**

### We must preserve this.

Our system cannot offer:

**Cancel instantly**

after an external RTO process has reached a state where current rules require office intervention.

Instead it should say:

> This application has already been received by the RTO.
>
> It can no longer be cancelled online.
>
> **What you need to do:** Contact/visit the responsible RTO to request withdrawal.

That is better UX without changing the rule.

---

# 12. RTO scrutiny and approval

The precise Karnataka internal workflow for every ownership-transfer variant is not fully exposed on the public citizen pages reviewed.

We should therefore **not invent officer designations, desk routing or automated approval logic**.

The legal process still ends with action by the relevant registering authority, while VAHAN clearly exposes the transition into an RTO-inwarded state.

### Architectural representation

The prototype treats the RTO as an external authority.

Possible citizen-facing states:

`SUBMITTED`
`SENT_TO_RTO`
`RTO_PROCESSING`
`CORRECTION_REQUIRED`
`APPROVED`
`REJECTED`
`REGISTRY_UPDATE_COMPLETE`

These are product-facing abstractions.

They must not be presented as a reproduction of every internal government workflow state.

---

# 13. Back-office simulator

The project should **not** propose a replacement RTO officer application.

For hackathon demonstration purposes only, include a protected route:

`/demo/backoffice`

Label it:

> **Back-office event simulator**
>
> This is not a proposed RTO interface. It exists only because the prototype cannot connect to live government systems.

It can emit mock external events:

- mark application inwarded;
- request correction;
- approve;
- reject;
- mark registry update complete.

The citizen interface then reacts exactly as it would if an authorised production integration delivered those events.

This gives us an end-to-end working demo without pretending to redesign RTO operations.

---

# 14. Status tracking

Current VAHAN has a separate **Know Your Application Status** page requiring an application number, vehicle registration number and CAPTCHA.

Permit applications are explicitly directed to a different Permit Portal for status.

### Problem

The user must:
- remember where the transaction lives;
- know the application number;
- understand which status system applies;
- interpret government workflow terminology.

### Our redesign

Every application lives under:

**My applications**

The user never has to manually remember the application number merely to see their own application.

The number still exists and is displayed because it remains an official/external reference.

Status should answer three questions first:

**What is happening?**

**Do I need to do anything?**

**What happens next?**

Example:

> **Being processed by the RTO**
>
> No action is required from you right now.
>
> We'll show the next update here when the external process changes.

---

# 15. Correction flow

The external RTO may require corrected information or documents.

That authority remains unchanged.

Our system improves only the interaction surrounding it.

Instead of:

`APPLICATION OBJECTED`

show:

> **We need one correction**
>
> The RTO has requested a clearer address proof.
>
> Your application has not been cancelled.
>
> Upload the replacement below.

The corrected document is then submitted to the mocked external adapter.

The system maintains the full audit trail.

---

# 16. Human/manual exception handling already exists

Another explicit example is VAHAN's Update Mobile Number workflow.

Its page states:

**Verification & Approval will be done at RTO**

and tells citizens who lack complete information to visit the RTO.

Withdrawal also exposes manual refund and RTO intervention. VAHAN states there is no fee refund from that portal and that the user may apply to the State Transport Department for a manual refund.

### Product rule

Never hide manual boundaries.

Instead:

**identify them early**.

The redesigned service should tell the citizen **before payment/submission** when a known circumstance is likely to require physical/manual follow-up.

---

# 17. Fitness is another clear hybrid service

VAHAN allows the citizen to apply for a Fitness Certificate, pay fees and book a slot online.

But the vehicle must then be produced for testing on the selected date/time.

The portal publishes a physical mechanical pre-check list and refers to an Automated Fitness Center test lane.

This illustrates our platform philosophy perfectly:

Software can make:
- eligibility;
- preparation;
- booking;
- payment;
- reminders;
- results;
- status

dramatically easier.

Software cannot remove the physical inspection merely because it would make a cleaner demo.

---

# 18. Current information-architecture flaws

## Fragmentation

Citizens must navigate among Karnataka Transport, VAHAN, Sarathi and permit-specific systems.

## Transaction-first organisation

The platform starts from registration number/registering authority and service categories rather than a persistent citizen/asset context.

## Repeated database identifiers

Status, withdrawal, buyer update and document functionality can ask users for application numbers, registration numbers and chassis characters.

## Disconnected account concept

VAHAN supports an account whose mobile number is its login ID, but many service and recovery paths still revolve around vehicle/application identifiers.

## Irrelevant information pollution

Current generic VAHAN surfaces simultaneously expose:
- fitness-test instructions;
- hypothecation-termination pre-checks;
- ownership-transfer instructions.

For example, extensive physical fitness instructions and hypothecation information are present on the generic login/service page before the service has even been selected.

## Browser-hostile behaviour

VAHAN currently states:

- F5 is disabled;
- Ctrl+F5 is disabled;
- right-click is disabled;
- users should clear browser cookies/history if pages do not display correctly;
- the site is "best viewed in Google Chrome."

This is precisely the opposite of resilient citizen-service design.

## Failure recovery is exposed as infrastructure state

A pending bank transaction can prevent another application/payment and requires the citizen to clear/reverify it.

The underlying reconciliation requirement is legitimate.

The UX burden does not need to be.

## Manual boundaries appear late

The citizen may only learn after reaching a particular state that withdrawal now requires an RTO visit.

Our system should predict and explain those boundaries earlier.

## Documentation gaps

Karnataka lists ownership transfer as a contactless VAHAN service while the current row contains no procedure guide or video.

The wider Karnataka information site also contains conspicuously dated support guidance, including references to legacy Office viewers and Adobe Flash Player in its help material.

---

# 19. What we are allowed to change

The prototype can radically improve:

| Area | Redesign |
|---|---|
| Discovery | One citizen-first service catalogue |
| Identity UX | Persistent synthetic citizen account |
| Asset context | My vehicles / My licence |
| Service eligibility | Readiness/rules engine |
| Forms | Progressive questions rather than monolithic forms |
| Prefill | Never request known data again |
| Seller/buyer coordination | Shared case with participant states |
| Documents | Contextual checklist with explanations |
| Authentication | Functional TOTP for prototype accounts |
| Payment UX | Resumable/idempotent mock transaction |
| Status | Unified, plain-language timeline |
| Errors | Actionable recovery |
| Manual steps | Explain exactly why/when they are required |
| Notifications | In-app prototype notifications |
| Reliability | Persistent state, retries, reconciliation |
| Accessibility | Semantic, keyboard-first, responsive |
| Language | English/Kannada |
| Low bandwidth | lightweight, resumable interaction |
| Support | Contextual next action rather than manuals |

---

# 20. What we must NOT change

The prototype must preserve or treat as externally authoritative:

| Boundary | Why |
|---|---|
| Statutory ownership-transfer roles | Legal/process requirement |
| Required forms/data | Governed by law/rules/state configuration |
| Seller-before-buyer sequencing | Current transfer process |
| RTO jurisdiction | Government process |
| RTO scrutiny/approval | External authority |
| Physical vehicle inspection | Required for applicable services |
| Financier consent | External legal/financial party |
| NOC/clearance requirements | External statutory process |
| Government identity verification | External authoritative service |
| Government registry | VAHAN/Sarathi remain source of truth |
| Fees/taxes | Authoritative external rules |
| Bank settlement | External payment infrastructure |
| Manual refund processes | Current department process |
| Postal/physical outputs | External service where applicable |
| Processing timelines | Cannot be shortened by our prototype |
| State-specific configuration | Must come from authoritative source |

---

# 21. Correct platform architecture

```text
Citizen
   │
   ▼
Citizen Web App
   │
   ▼
Citizen Orchestration API
   │
   ├──────── Account & Session Service
   │
   ├──────── Service Catalogue
   │
   ├──────── Rules / Readiness Engine
   │
   ├──────── Application Workflow Engine
   │
   ├──────── Document Requirement Service
   │
   ├──────── Notification Service
   │
   ├──────── Audit Log
   │
   └──────── Integration Adapter Layer
                │
                ├── Mock VAHAN Registry Adapter
                ├── Mock Sarathi Adapter
                ├── Demo Identity Adapter
                ├── Mock Payment Adapter
                ├── Mock RTO Status Adapter
                └── Mock Notification Adapter
```

The application database is **not a replacement transport registry**.

It stores the citizen-facing case/orchestration state.

External government systems remain authoritative.

---

# 22. Database model

Recommended primary entities:

```text
User
UserProfile
Session
TotpCredential

ExternalIdentityReference

VehicleProjection
DrivingLicenceProjection

ServiceDefinition
ServiceRule
EligibilityResult

Application
ApplicationParticipant
ApplicationState
WorkflowEvent

DocumentRequirement
DocumentSubmission

Payment
PaymentAttempt

ExternalCaseReference
ExternalStatusEvent

Notification

AuditEvent
IntegrationAttempt
```

`VehicleProjection` is intentionally named a projection rather than authoritative `VehicleRegistryRecord`.

It represents the latest information supplied by the synthetic VAHAN adapter.

In a future authorised implementation it should retain:

`external_source`
`external_reference`
`last_synced_at`

---

# 23. Ownership history

Do not simply implement:

`vehicle.owner_id`

The citizen-facing model needs ownership history because transfer changes ownership over time.

Use something equivalent to:

```text
VehicleOwnership
- vehicle_id
- owner_reference
- valid_from
- valid_until
- source
- transfer_application_reference
```

In the hackathon this is synthetic.

The real VAHAN registry remains authoritative in a production design.

---

# 24. Workflow model

The citizen-facing transfer workflow can use:

```text
DRAFT

SELLER_ACTION_REQUIRED
SELLER_VERIFIED

BUYER_ACTION_REQUIRED
BUYER_VERIFIED

DOCUMENTS_REQUIRED
READY_FOR_SUBMISSION

PAYMENT_REQUIRED
PAYMENT_PENDING
PAYMENT_CONFIRMED

SUBMITTED
SENT_TO_RTO
RTO_PROCESSING

CORRECTION_REQUIRED

APPROVED
REJECTED

REGISTRY_UPDATE_COMPLETE

WITHDRAWAL_REQUIRES_RTO
```

These are **our orchestration states**, not a claim that VAHAN internally uses these exact names.

---

# 25. Adapter design is critical

External dependencies should be interfaces.

Example:

```text
VehicleRegistryProvider
IdentityVerificationProvider
PaymentProvider
GovernmentCaseProvider
NotificationProvider
```

The hackathon implements:

```text
MockVehicleRegistryProvider
TotpDemoIdentityProvider
MockPaymentProvider
MockRtoCaseProvider
InAppNotificationProvider
```

A hypothetical authorised implementation can replace these adapters.

The core workflow should not need to be rewritten.

---

# 26. Account model

Create two fully functional seeded demo citizens.

## Seller
Ananya Rao

Owns:
`KA01AB1234`

## Buyer
Rahul Shetty

The accounts should have:

- real local database records;
- real sessions;
- working TOTP;
- authorisation boundaries;
- persistent application state;
- account switching only through a clearly labelled demo helper.

The project must never create actual government/Aadhaar identities.

---

# 27. Why this architecture scales

The citizen layer does not hard-code:

`TransferCarPage`

Instead:

```text
Citizen
→ Asset
→ Service definition
→ Rules
→ Workflow
→ External process
```

Therefore future services can be attached to the same platform.

### Motorcycle transfer

Same base ownership-transfer concept.

Vehicle-class rules can change requirements.

### Private car

Golden-path prototype.

### Taxi/commercial vehicle

Same citizen/account infrastructure, but rules may additionally depend on:

- vehicle class;
- permit;
- fitness;
- tax;
- other statutory conditions.

The actual permit/RTO processes remain external.

### Old private vehicle / RC renewal

Same citizen platform.

Different workflow potentially includes inspection/fitness/renewal requirements.

### Driving licence renewal

Same citizen account and application UX.

Different integration adapter:

`SarathiProvider`

### Fitness

Same application/payment/status platform.

External physical testing remains mandatory where applicable.

### Permits

Same citizen shell.

External permit process remains authoritative.

---

# 28. Testing requirements

The most important tests are not visual snapshot tests.

## Workflow tests

Validate every allowed transition.

Reject impossible transitions.

Ensure seller and buyer cannot perform one another's actions.

## Manual-boundary tests

Simulate:

- RTO processing delay;
- correction request;
- rejection;
- approval;
- RTO-required withdrawal;
- unavailable external system.

The application must never fabricate success merely because an external system is unavailable.

## Database tests

Test:

- migrations;
- constraints;
- ownership history;
- transactions;
- rollback;
- duplicate events;
- referential integrity.

## Authentication tests

Test:

- valid TOTP;
- invalid TOTP;
- expired code;
- replay considerations;
- unauthorised application access;
- session expiry;
- logout;
- buyer trying to access seller-only actions.

## Integration-contract tests

Mock:

- success;
- timeout;
- malformed response;
- unavailable government adapter;
- stale external status;
- repeated event;
- event arriving out of order.

## Reconciliation tests

Especially important.

Test:

**local application says payment pending while payment provider says paid**

and:

**local application says RTO processing while a later external event says correction required**

The workflow must reconcile safely.

## Payment tests

Test:

- success;
- failure;
- pending;
- abandoned browser;
- retry;
- duplicate callback;
- reconciliation.

## Concurrency tests

Test:

- seller and buyer active simultaneously;
- duplicate browser tabs;
- double submission;
- event arriving during user edit.

## Resume/recovery tests

Close the browser at every stage.

Sign back in.

The application must return the user to the correct state.

## Security tests

Test:

- IDOR;
- privilege escalation;
- XSS;
- CSRF where applicable;
- injection;
- brute-force protection;
- secret leakage;
- secure cookies;
- rate limits;
- role enforcement.

## Privacy tests

No genuine personal information.

No Aadhaar/PAN data.

Synthetic documents only.

Secrets stay server-side.

## Accessibility

Keyboard-only completion.

Screen-reader semantics.

Focus handling.

Error announcements.

Touch-target sizes.

Contrast.

Reduced motion.

## Kannada

Test every golden-path screen.

No untranslated keys.

No broken layouts.

No clipped long Kannada copy.

## Low bandwidth

Throttle network.

Refresh during requests.

Retry failed fetches.

Ensure the user does not lose entered information.

---

# 29. Golden-path prototype scope

The fully working demonstrated service should remain:

**Normal sale of a privately owned Karnataka-registered non-transport vehicle to another Karnataka resident.**

The system can visibly demonstrate that its underlying architecture supports different asset/service types.

It should **not** pretend all those services are implemented.

Every feature demonstrated must actually work, which is an explicit competition rule.

---

# 30. Optional second workflow

Only after ownership transfer is complete, tested and polished:

**Renewal of registration for a private non-transport vehicle**

This is useful because it exercises different platform primitives:

Ownership transfer demonstrates:

**multi-party orchestration**

Renewal demonstrates:

**rules + eligibility + external/physical processing boundaries**

Do not start it until the first journey is complete.

---

# 31. Final product statement

The project should be described as:

> **A citizen-facing orchestration layer for transport services, demonstrated through a complete vehicle-ownership-transfer journey.**
>
> Instead of requiring citizens to understand VAHAN, Sarathi, permit systems, application numbers and departmental boundaries, the prototype organises services around the citizen and their vehicle or licence.
>
> The underlying government processes remain unchanged. The platform makes those processes easier to understand, complete, recover and track.
>
> Government databases, identity verification, payments and RTO decisions are represented by clearly labelled simulated adapters in the hackathon prototype.

That is the design boundary for the entire project.

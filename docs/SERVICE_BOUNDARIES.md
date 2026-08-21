# Service and Authority Boundaries

## Boundary rule

MoveKA redesigns the citizen-facing interaction around existing transport processes. It does not redesign statutory decision-making or claim ownership of an external authority's data.

| Capability | MoveKA owns | External authority owns |
|---|---|---|
| Account access | Fixed demo account, shared demo password, and opaque session | Aadhaar/eKYC, government identity, VAHAN-linked mobile ownership |
| Vehicle context | Cached synthetic `VehicleProjection` | Registered vehicle facts and legal ownership |
| Service guidance | Versioned synthetic demo rules and explanations | Current law, state configuration, fees, jurisdiction, eligibility, and requirements |
| Transfer coordination | Seller/buyer participants, drafts, next actions, and audit trail | Statutory seller/buyer obligations and legally valid consent/signature |
| Documents | Requirement explanation and synthetic submission metadata | Official required documents, forms, verification, and acceptance |
| Payment | Demo payment state and reconciliation workflow | Actual fees, bank settlement, tax, and refunds |
| RTO case | External reference, projection, and plain-language status | Inwarding, scrutiny, correction, approval, rejection, and internal routing |
| Registry completion | Projection updated from a simulated event | Authoritative VAHAN registry update |
| Notifications | In-app prototype messages | Statutory notice and official communication |

## Required adapters

```ts
interface VehicleRegistryProvider {
  getVehicle(reference: string): Promise<VehicleProjection>;
}

interface IdentityVerificationProvider {
  createEnrollment(userId: string): Promise<EnrollmentResult>;
  verify(userId: string, code: string): Promise<VerificationResult>;
}

interface PaymentProvider {
  createPayment(input: CreatePaymentInput): Promise<PaymentResult>;
  reconcile(providerReference: string): Promise<PaymentStatus>;
}

interface GovernmentCaseProvider {
  submit(input: SubmitCaseInput): Promise<ExternalCaseReference>;
  requestWithdrawal(input: WithdrawalInput): Promise<WithdrawalResult>;
}

interface NotificationProvider {
  notify(input: NotificationInput): Promise<void>;
}
```

Every external command accepts an idempotency key. Every inbound event is persisted before it is allowed to change workflow state.

## Demo implementations

- `MockVehicleRegistryProvider`
- Shared-password citizen demo gate plus a separate legacy operator enrollment path
- `MockPaymentProvider`
- `MockRtoCaseProvider`
- `InAppNotificationProvider`

The back-office event simulator is not an implementation of `GovernmentCaseProvider` for production. It is a protected demo control that emits authenticated synthetic events into the same inbound contract.

## Mandatory user-facing disclosures

- Independent hackathon prototype
- Synthetic demo citizens and vehicle records
- The shared demo password grants access only to a fixed fictional prototype account
- Demo payment is not a bank transaction and does not calculate an official fee
- Government/RTO/registry events are simulated
- Product-facing RTO states are plain-language abstractions, not internal officer workflow states

## Forbidden claims

- The shared demo password or session verifies Aadhaar, VAHAN ownership, or a government-linked mobile number
- A readiness result is official eligibility
- The service is contactless or requires no RTO visit without authoritative configuration
- Payment, submission, or approval means ownership has transferred
- Approval means the registry has already been updated
- MoveKA can instantly withdraw or refund an inwarded case
- A simulated reference is government-issued
- The simulator is a proposed replacement RTO portal

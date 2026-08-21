import type { GovernmentCaseProvider, IdentityVerificationProvider, NotificationProvider, PaymentProvider, SyntheticVehicle, VehicleRegistryProvider } from "./ports";

export class MockVehicleRegistryProvider implements VehicleRegistryProvider {
  constructor(private readonly mode: "OK" | "UNAVAILABLE" | "MALFORMED" = "OK") {}
  async getVehicle(reference: string): Promise<SyntheticVehicle> {
    if (this.mode === "UNAVAILABLE") throw new Error("Synthetic registry is unavailable.");
    if (reference !== "KA01AB1234") throw new Error("Synthetic vehicle projection not found.");
    if (this.mode === "MALFORMED") return { id: "bad", registrationNumber: "KA01AB1234", source: "MOCK_VEHICLE_REGISTRY", sourceVersion: "seed-v1", ownerId: "synthetic-ananya-rao", ownerReference: "bad", vehicleClass: "PRIVATE_NON_TRANSPORT", registrationState: "KA", lastSyncedAt: new Date("invalid") };
    return { id: "synthetic-vehicle-ka01ab1234", registrationNumber: "KA01AB1234", source: "MOCK_VEHICLE_REGISTRY", sourceVersion: "seed-v1", ownerId: "synthetic-ananya-rao", ownerReference: "synthetic-ownership-v1", vehicleClass: "PRIVATE_NON_TRANSPORT", registrationState: "KA", lastSyncedAt: new Date("2026-08-20T00:00:00.000Z") };
  }
}
export class TotpDemoIdentityProvider implements IdentityVerificationProvider {
  async createEnrollment(): Promise<{ enrollmentId: string }> { throw new Error("Use the built-in prototype TOTP enrollment service; this adapter is retained only as a boundary placeholder."); }
  async verify(): Promise<{ verified: boolean }> { throw new Error("Use the built-in prototype TOTP verification service; this adapter is retained only as a boundary placeholder."); }
}
export class MockPaymentProvider implements PaymentProvider {
  async createPayment(input: { applicationId: string; idempotencyKey: string }): Promise<{ providerReference: string; status: "PENDING" }> { return { providerReference: `synthetic-payment-${input.applicationId}-${input.idempotencyKey}`, status: "PENDING" }; }
  async reconcile(): Promise<"PENDING" | "CONFIRMED" | "FAILED"> { throw new Error("Synthetic payment reconciliation requires a later simulator task."); }
}
export type MockRtoMode = "ACKNOWLEDGED" | "UNAVAILABLE_TIMEOUT" | "MALFORMED";
export class MockRtoCaseProvider implements GovernmentCaseProvider {
  constructor(private readonly mode: MockRtoMode = "ACKNOWLEDGED") {}
  async submit(input?: { idempotencyKey?: string }): Promise<{ externalReference: string }> { if (this.mode === "UNAVAILABLE_TIMEOUT") throw new Error("Synthetic RTO acknowledgement is unavailable."); if (this.mode === "MALFORMED") return { externalReference: "" }; return { externalReference: `synthetic-rto-case-${input?.idempotencyKey ?? "unknown"}` }; }
  async submitCorrection(): Promise<{ delivered: boolean }> { if (this.mode === "UNAVAILABLE_TIMEOUT") throw new Error("Synthetic correction delivery unavailable."); if (this.mode === "MALFORMED") return { delivered: false }; return { delivered: true }; }
  async requestWithdrawal(): Promise<{ accepted: boolean }> { if (this.mode === "UNAVAILABLE_TIMEOUT") throw new Error("Synthetic withdrawal delivery unavailable."); if (this.mode === "MALFORMED") return { accepted: false }; return { accepted: true }; }
}
export class InAppNotificationProvider implements NotificationProvider { async notify(): Promise<void> { /* Persistence wiring is deferred; delivery never determines workflow truth. */ } }

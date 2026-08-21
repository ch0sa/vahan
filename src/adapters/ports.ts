export type SyntheticVehicle = { id: string; registrationNumber: string; source: "MOCK_VEHICLE_REGISTRY"; sourceVersion: string; ownerId: string; ownerReference: string; vehicleClass: "PRIVATE_NON_TRANSPORT"; registrationState: "KA"; lastSyncedAt: Date };
export interface VehicleRegistryProvider { getVehicle(reference: string): Promise<SyntheticVehicle>; }
export interface IdentityVerificationProvider { createEnrollment(userId: string): Promise<{ enrollmentId: string }>; verify(userId: string, code: string): Promise<{ verified: boolean }>; }
export interface PaymentProvider { createPayment(input: { applicationId: string; idempotencyKey: string }): Promise<{ providerReference: string; status: "PENDING" }>; reconcile(providerReference: string): Promise<"PENDING" | "CONFIRMED" | "FAILED">; }
export interface GovernmentCaseProvider { submit(input: { applicationId: string; idempotencyKey: string }): Promise<{ externalReference: string }>; requestWithdrawal(input: { externalReference: string; idempotencyKey: string }): Promise<{ accepted: boolean }>; }
export interface NotificationProvider { notify(input: { userId: string; message: string }): Promise<void>; }

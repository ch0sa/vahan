import { decryptSecret, encryptSecret, hashOpaqueToken } from "./crypto";
import { createSessionMaterial, isActiveSession } from "./session";
import { createTotpEnrollment, currentStep, validateTotp } from "./totp";

export const MAX_TOTP_FAILURES = 5;
export const LOCKOUT_MS = 60_000;
export type CredentialState = { encryptedSecret: string; encryptionIv: string; enrollmentState: string; lastAcceptedStep: number | null; failedAttempts: number; lockedUntil: Date | null };
export type CredentialUpdates = { enrollmentState?: string; lastAcceptedStep?: number; failedAttempts?: number; lockedUntil?: Date | null };
export type VerifyOutcome = ({ ok: true; session: ReturnType<typeof createSessionMaterial>; acceptedStep: number } | { ok: false; reason: "INVALID" | "REPLAY" | "LOCKED" }) & { updates?: CredentialUpdates };
export function beginEnrollment(encryptionKey: string) {
  const enrollment = createTotpEnrollment();
  return { uri: enrollment.uri, stored: encryptSecret(enrollment.secret, encryptionKey) };
}
export function canBeginInitialEnrollment(enrollmentState: string | undefined) { return enrollmentState !== "ENROLLED"; }
export function verifyCredential(input: { credential: CredentialState; code: string; encryptionKey: string; sessionHashKey: string; now?: number }): VerifyOutcome {
  const now = input.now ?? Date.now();
  if (input.credential.lockedUntil && input.credential.lockedUntil.getTime() > now) return { ok: false, reason: "LOCKED" };
  const secret = decryptSecret(input.credential.encryptedSecret, input.credential.encryptionIv, input.encryptionKey);
  const delta = validateTotp(secret, input.code, now);
  const acceptedStep = currentStep(now) + (delta ?? 0);
  if (delta === null) {
    const failedAttempts = input.credential.failedAttempts + 1;
    return { ok: false, reason: "INVALID", updates: { failedAttempts, lockedUntil: failedAttempts >= MAX_TOTP_FAILURES ? new Date(now + LOCKOUT_MS) : null } };
  }
  if (input.credential.lastAcceptedStep !== null && acceptedStep <= input.credential.lastAcceptedStep) return { ok: false, reason: "REPLAY" };
  return { ok: true, acceptedStep, session: createSessionMaterial(input.sessionHashKey, now), updates: { enrollmentState: "ENROLLED", lastAcceptedStep: acceptedStep, failedAttempts: 0, lockedUntil: null } };
}
export function lookupSessionToken(token: string, sessionHashKey: string) { return hashOpaqueToken(token, sessionHashKey); }
export function canConsumeTotpStep(lastAcceptedStep: number | null, acceptedStep: number) { return lastAcceptedStep === null || lastAcceptedStep < acceptedStep; }
export { isActiveSession };

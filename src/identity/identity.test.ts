import { describe, expect, it } from "vitest";
import { encryptSecret } from "./crypto";
import { identityDisclosure, prototypeIdentityDisclosure } from "./disclosure";
import { requireApplicationRole } from "./authorization";
import { createSessionMaterial, isActiveSession } from "./session";
import { generateTotp } from "./totp";
import { LOCKOUT_MS, MAX_TOTP_FAILURES, canBeginInitialEnrollment, canConsumeTotpStep, type CredentialState, verifyCredential } from "./service";
import { authErrorMessage } from "./errors";
import { createEnrollmentChallenge, verifyEnrollmentChallenge } from "./enrollment";
import { identityConfig, isDemoMode } from "./config";

const encryptionKey = Buffer.alloc(32, 7).toString("base64");
const sessionHashKey = "test-session-key";
const now = 1_700_000_000_000;
const secret = "JBSWY3DPEHPK3PXP";
const credential = () => ({ ...encryptSecret(secret, encryptionKey), enrollmentState: "PENDING", lastAcceptedStep: null, failedAttempts: 0, lockedUntil: null });

describe("prototype identity foundations", () => {
  it("accepts a valid RFC-compatible TOTP once and rejects a replay", () => {
    const code = generateTotp(secret, now);
    const accepted = verifyCredential({ credential: credential(), code, encryptionKey, sessionHashKey, now });
    expect(accepted.ok).toBe(true);
    if (!accepted.ok) return;
    const replay = verifyCredential({ credential: { ...credential(), ...accepted.updates }, code, encryptionKey, sessionHashKey, now });
    expect(replay).toMatchObject({ ok: false, reason: "REPLAY" });
  });
  it("backs off after repeated invalid codes", () => {
    let state: CredentialState = credential();
    for (let attempt = 0; attempt < MAX_TOTP_FAILURES; attempt += 1) {
      const result = verifyCredential({ credential: state, code: "000000", encryptionKey, sessionHashKey, now });
      expect(result).toMatchObject({ ok: false, reason: "INVALID" });
      state = { ...state, ...result.updates };
    }
    expect(state.lockedUntil?.getTime()).toBe(now + LOCKOUT_MS);
    expect(verifyCredential({ credential: state, code: generateTotp(secret, now), encryptionKey, sessionHashKey, now })).toMatchObject({ ok: false, reason: "LOCKED" });
  });
  it("models opaque session expiry and logout semantics", () => {
    const material = createSessionMaterial(sessionHashKey, now);
    const active = { id: "session", userId: "synthetic-ananya-rao", tokenHash: material.tokenHash, expiresAt: material.expiresAt, revokedAt: null };
    expect(isActiveSession(active, now)).toBe(true);
    expect(isActiveSession({ ...active, revokedAt: new Date(now) }, now)).toBe(false);
    expect(isActiveSession(active, material.expiresAt.getTime())).toBe(false);
  });
  it("denies participant IDOR while allowing only the matching role or demo operator", () => {
    expect(requireApplicationRole({ userId: "seller", role: "CITIZEN", participantRole: "SELLER" }, "BUYER")).toBe(false);
    expect(requireApplicationRole({ userId: "buyer", role: "CITIZEN", participantRole: "BUYER" }, "BUYER")).toBe(true);
    expect(requireApplicationRole({ userId: "operator", role: "DEMO_OPERATOR" }, "SELLER")).toBe(false);
  });
  it("keeps the prototype identity disclosure explicit", () => {
    expect(prototypeIdentityDisclosure).toMatch(/prototype/i);
    expect(prototypeIdentityDisclosure).toMatch(/does not verify/i);
    expect(identityDisclosure("kn")).toMatch(/Aadhaar/);
    expect(authErrorMessage("replay", "kn")).not.toMatch(/already used/i);
  });
  it("models the conditional consume used to stop concurrent TOTP replay", () => {
    expect(canConsumeTotpStep(null, 9)).toBe(true);
    expect(canConsumeTotpStep(9, 9)).toBe(false);
    expect(canConsumeTotpStep(10, 9)).toBe(false);
  });
  it("allows initial or pending enrollment but never helper overwrite of an enrolled credential", () => {
    expect(canBeginInitialEnrollment(undefined)).toBe(true);
    expect(canBeginInitialEnrollment("PENDING")).toBe(true);
    expect(canBeginInitialEnrollment("ENROLLED")).toBe(false);
  });
  it("signs high-entropy enrollment authority and rejects tampering", () => {
    const challenge = createEnrollmentChallenge(sessionHashKey, "synthetic-ananya-rao", now);
    expect(verifyEnrollmentChallenge(challenge.token, sessionHashKey, now)).toMatchObject({ userId: "synthetic-ananya-rao", hash: challenge.hash });
    expect(verifyEnrollmentChallenge(`${challenge.token}x`, sessionHashKey, now)).toBeNull();
  });
  it("maps safe actionable errors and fails demo mode closed", () => {
    expect(authErrorMessage("replay")).toMatch(/already used/i);
    const previous = process.env.DEMO_MODE;
    process.env.DEMO_MODE = "false"; expect(isDemoMode()).toBe(false);
    process.env.DEMO_MODE = previous;
  });
  it("requires both identity keys to be canonical base64 32-byte values", () => {
    const previousEncryption = process.env.TOTP_ENCRYPTION_KEY; const previousSession = process.env.SESSION_HASH_KEY;
    process.env.TOTP_ENCRYPTION_KEY = encryptionKey; process.env.SESSION_HASH_KEY = encryptionKey;
    expect(identityConfig()).toEqual({ encryptionKey, sessionHashKey: encryptionKey });
    process.env.SESSION_HASH_KEY = "not-a-key"; expect(() => identityConfig()).toThrow(/unavailable/i);
    process.env.TOTP_ENCRYPTION_KEY = previousEncryption; process.env.SESSION_HASH_KEY = previousSession;
  });
});

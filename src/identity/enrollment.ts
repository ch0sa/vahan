import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const ENROLLMENT_DURATION_MS = 10 * 60 * 1000;
export function createEnrollmentChallenge(sessionHashKey: string, userId: string, now = Date.now()) {
  const nonce = randomBytes(32).toString("base64url");
  const expiresAt = now + ENROLLMENT_DURATION_MS;
  const payload = `${userId}.${nonce}.${expiresAt}`;
  const signature = createHmac("sha256", sessionHashKey).update(payload).digest("base64url");
  return { token: `${payload}.${signature}`, hash: createHmac("sha256", sessionHashKey).update(nonce).digest("hex"), expiresAt: new Date(expiresAt) };
}
export function verifyEnrollmentChallenge(token: string | undefined, sessionHashKey: string, now = Date.now()) {
  if (!token) return null;
  const [userId, nonce, expiry, signature] = token.split(".");
  if (!userId || !nonce || !expiry || !signature || Number(expiry) <= now) return null;
  const expected = createHmac("sha256", sessionHashKey).update(`${userId}.${nonce}.${expiry}`).digest("base64url");
  const received = Buffer.from(signature); const signed = Buffer.from(expected);
  if (received.length !== signed.length || !timingSafeEqual(received, signed)) return null;
  return { userId, hash: createHmac("sha256", sessionHashKey).update(nonce).digest("hex") };
}

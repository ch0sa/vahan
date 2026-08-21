import { hashOpaqueToken, randomOpaqueToken } from "./crypto";

export const SESSION_DURATION_MS = 1000 * 60 * 60 * 8;
export type SessionRecord = { id: string; userId: string; tokenHash: string; expiresAt: Date; revokedAt: Date | null };
export function createSessionMaterial(sessionHashKey: string, now = Date.now()) {
  const token = randomOpaqueToken();
  return { token, tokenHash: hashOpaqueToken(token, sessionHashKey), expiresAt: new Date(now + SESSION_DURATION_MS) };
}
export function isActiveSession(session: SessionRecord | null, now = Date.now()) { return Boolean(session && !session.revokedAt && session.expiresAt.getTime() > now); }

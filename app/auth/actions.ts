"use server";

import QRCode from "qrcode";
import { Secret, TOTP } from "otpauth";
import { redirect } from "next/navigation";
import { z } from "zod";
import { clearEnrollmentCookie, clearSessionCookie, readEnrollmentCookie, readSessionCookie, setEnrollmentCookie, setSessionCookie } from "@/src/identity/cookies";
import { identityConfig, requireDemoMode, sessionHashKey, validDemoSharedPassword, validOperatorBootstrapToken } from "@/src/identity/config";
import { prototypeIdentityDisclosure } from "@/src/identity/disclosure";
import { createEnrollmentChallenge, verifyEnrollmentChallenge } from "@/src/identity/enrollment";
import { canBeginInitialEnrollment, lookupSessionToken, beginEnrollment, verifyCredential } from "@/src/identity/service";
import { IdentityRepository } from "@/src/identity/repositories";
import { prisma } from "@/src/lib/prisma";
import { createSessionMaterial } from "@/src/identity/session";

const fixtureSchema = z.object({ userId: z.enum(["synthetic-ananya-rao", "synthetic-rahul-shetty", "synthetic-demo-operator"]) });
const citizenSchema = z.object({ userId: z.enum(["synthetic-ananya-rao", "synthetic-rahul-shetty"]), password: z.string().min(1).max(128) });
const codeSchema = z.object({ code: z.string().regex(/^\d{6}$/) });
const repo = new IdentityRepository(prisma);
const unavailable = () => redirect("/?error=demo-unavailable");
function failure(reason: "INVALID" | "REPLAY" | "LOCKED") { return reason === "LOCKED" ? "lockout" : reason === "REPLAY" ? "replay" : "verification"; }
async function revokeBrowserSession() {
  const token = await readSessionCookie();
  if (token) await repo.revokeSession(lookupSessionToken(token, sessionHashKey()));
  await clearSessionCookie();
}
export async function selectDemoUser(formData: FormData) {
  try { requireDemoMode(); } catch { unavailable(); }
  const parsed = fixtureSchema.safeParse({ userId: formData.get("userId") });
  const isOperator=parsed.success&&parsed.data.userId==="synthetic-demo-operator";
  if (!parsed.success || !isOperator || !validOperatorBootstrapToken(String(formData.get("bootstrapToken") ?? "")) || !(await repo.findDemoOperator())) redirect("/auth/sign-in?error=invalid-account");
  await revokeBrowserSession();
  const existing = await repo.getCredential(parsed.data.userId);
  if (!canBeginInitialEnrollment(existing?.enrollmentState)) redirect("/auth/sign-in?error=enrolled-account");
  const { encryptionKey, sessionHashKey } = identityConfig();
  const priorChallenge = verifyEnrollmentChallenge(await readEnrollmentCookie(), sessionHashKey);
  if (existing?.enrollmentState === "PENDING" && priorChallenge?.userId === parsed.data.userId && priorChallenge.hash === existing.enrollmentChallengeHash && existing.enrollmentExpiresAt && existing.enrollmentExpiresAt.getTime() > Date.now()) redirect("/auth/enroll");
  const enrollment = beginEnrollment(encryptionKey);
  const challenge = createEnrollmentChallenge(sessionHashKey, parsed.data.userId);
  await repo.createPendingCredential({ userId: parsed.data.userId, ...enrollment.stored, enrollmentChallengeHash: challenge.hash, enrollmentExpiresAt: challenge.expiresAt });
  await setEnrollmentCookie(challenge.token);
  redirect("/auth/enroll");
}
export async function enrollmentQr() {
  if (process.env.DEMO_MODE !== "true") return null;
  const challenge = verifyEnrollmentChallenge(await readEnrollmentCookie(), identityConfig().sessionHashKey);
  if (!challenge) return null;
  const credential = await repo.getCredential(challenge.userId);
  if (!credential || credential.enrollmentState !== "PENDING" || credential.enrollmentChallengeHash !== challenge.hash || !credential.enrollmentExpiresAt || credential.enrollmentExpiresAt.getTime() <= Date.now()) return null;
  const { decryptSecret } = await import("@/src/identity/crypto");
  const secret = decryptSecret(credential.encryptedSecret, credential.encryptionIv, identityConfig().encryptionKey);
  const uri = new TOTP({ issuer: "MoveKA prototype", label: "prototype account", algorithm: "SHA1", digits: 6, period: 30, secret: Secret.fromBase32(secret) }).toString();
  return { image: await QRCode.toDataURL(uri, { errorCorrectionLevel: "M", margin: 1, width: 240 }), disclosure: prototypeIdentityDisclosure };
}
export async function confirmEnrollment(formData: FormData) {
  try { requireDemoMode(); } catch { unavailable(); }
  const parsed = codeSchema.safeParse({ code: formData.get("code") });
  const config = identityConfig(); const challenge = verifyEnrollmentChallenge(await readEnrollmentCookie(), config.sessionHashKey);
  if (!parsed.success || !challenge) redirect("/auth/enroll?error=restart");
  const credential = await repo.getCredential(challenge.userId);
  if (!credential || credential.enrollmentState !== "PENDING" || credential.enrollmentChallengeHash !== challenge.hash) redirect("/auth/enroll?error=restart");
  const result = verifyCredential({ credential, code: parsed.data.code, ...config });
  if (!result.ok) { await repo.updateCredential(challenge.userId, result.updates ?? {}); redirect(`/auth/enroll?error=${failure(result.reason)}`); }
  const session = await repo.consumeVerificationAndCreateSession({ userId: challenge.userId, expectedLastStep: credential.lastAcceptedStep, acceptedStep: result.acceptedStep, updates: { enrollmentState: "ENROLLED", failedAttempts: 0, lockedUntil: null }, tokenHash: result.session.tokenHash, expiresAt: result.session.expiresAt });
  if (!session) redirect("/auth/enroll?error=replay");
  await clearEnrollmentCookie(); await setSessionCookie(result.session.token); redirect("/auth/signed-in");
}
export async function signIn(formData: FormData) {
  try { requireDemoMode(); } catch { unavailable(); }
  const parsed = citizenSchema.safeParse({ userId: formData.get("userId"), password: formData.get("password") });
  if (!parsed.success || !validDemoSharedPassword(parsed.success ? parsed.data.password : undefined) || !(await repo.findSyntheticUser(parsed.success ? parsed.data.userId : ""))) redirect("/auth/sign-in?error=invalid-password");
  const oldToken = await readSessionCookie();
  const session = createSessionMaterial(sessionHashKey());
  await repo.rotateSession(oldToken ? lookupSessionToken(oldToken, sessionHashKey()) : "", { userId: parsed.data.userId, tokenHash: session.tokenHash, expiresAt: session.expiresAt });
  await setSessionCookie(session.token); redirect("/auth/signed-in");
}
export async function signOut() { try { requireDemoMode(); } catch { unavailable(); } await revokeBrowserSession(); redirect("/"); }

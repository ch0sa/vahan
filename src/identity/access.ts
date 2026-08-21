import { redirect } from "next/navigation";
import { readSessionCookie } from "./cookies";
import { isDemoMode, sessionHashKey } from "./config";
import { IdentityRepository } from "./repositories";
import { lookupSessionToken, isActiveSession } from "./service";
import { prisma } from "@/src/lib/prisma";

const repo = new IdentityRepository(prisma);
export async function currentSession() {
  if (!isDemoMode()) return null;
  const token = await readSessionCookie();
  if (!token) return null;
  const session = await repo.findSession(lookupSessionToken(token, sessionHashKey()));
  return session && isActiveSession(session) ? session : null;
}
export async function requireCurrentSession() { const session = await currentSession(); if (!session) redirect(isDemoMode() ? "/auth/sign-in?error=session-required" : "/?error=demo-unavailable"); return session; }
export async function requireDemoOperator() { const session = await requireCurrentSession(); if (session.user.role !== "DEMO_OPERATOR") redirect("/?error=unavailable"); return session; }

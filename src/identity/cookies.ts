import { cookies } from "next/headers";

export const SESSION_COOKIE = "moveka_prototype_session";
export const ENROLLMENT_COOKIE = "moveka_prototype_enrollment";
export const WORKSPACE_COOKIE = "moveka_demo_workspace";
const secure = process.env.NODE_ENV === "production";
export async function setSessionCookie(token: string) { (await cookies()).set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: 60 * 60 * 8 }); }
export async function clearSessionCookie() { (await cookies()).set(SESSION_COOKIE, "", { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: 0 }); }
export async function readSessionCookie() { return (await cookies()).get(SESSION_COOKIE)?.value; }
export async function setEnrollmentCookie(challenge: string) { (await cookies()).set(ENROLLMENT_COOKIE, challenge, { httpOnly: true, sameSite: "lax", secure, path: "/auth", maxAge: 10 * 60 }); }
export async function readEnrollmentCookie() { return (await cookies()).get(ENROLLMENT_COOKIE)?.value; }
export async function clearEnrollmentCookie() { (await cookies()).set(ENROLLMENT_COOKIE, "", { httpOnly: true, sameSite: "lax", secure, path: "/auth", maxAge: 0 }); }
export async function setWorkspaceCookie(workspaceId: string) { (await cookies()).set(WORKSPACE_COOKIE, workspaceId, { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: 60 * 60 * 8 }); }
export async function readWorkspaceCookie() { return (await cookies()).get(WORKSPACE_COOKIE)?.value; }

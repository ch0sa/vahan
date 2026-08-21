import { createHash, timingSafeEqual } from "node:crypto";

const MAX_DEMO_PASSWORD_LENGTH = 128;
function base64Key(value: string | undefined) {
  if (!value) throw new Error("Identity configuration is unavailable.");
  const decoded = Buffer.from(value, "base64");
  if (decoded.length !== 32 || decoded.toString("base64") !== value) throw new Error("Identity configuration is unavailable.");
  return value;
}
export function operatorBootstrapToken() { return base64Key(process.env.DEMO_OPERATOR_BOOTSTRAP_TOKEN); }
export function validOperatorBootstrapToken(value: string | undefined) { try { const expected=Buffer.from(operatorBootstrapToken()); const supplied=Buffer.from(value??""); return supplied.length===expected.length && timingSafeEqual(supplied,expected); } catch { return false; } }
export function demoSharedPassword() { return process.env.DEMO_SHARED_PASSWORD ?? "admin"; }
export function validDemoSharedPassword(value: string | undefined) {
  if (!isDemoMode() || typeof value !== "string" || value.length === 0 || value.length > MAX_DEMO_PASSWORD_LENGTH) return false;
  const configured = demoSharedPassword();
  if (configured.length === 0 || configured.length > MAX_DEMO_PASSWORD_LENGTH) return false;
  const digest = (candidate: string) => createHash("sha256").update(candidate, "utf8").digest();
  return timingSafeEqual(digest(value), digest(configured));
}
export { MAX_DEMO_PASSWORD_LENGTH };
export function identityConfig() { return { encryptionKey: base64Key(process.env.TOTP_ENCRYPTION_KEY), sessionHashKey: base64Key(process.env.SESSION_HASH_KEY) }; }
export function sessionHashKey() { return base64Key(process.env.SESSION_HASH_KEY); }
export function isDemoMode() { return process.env.DEMO_MODE === "true"; }
export function requireDemoMode() { if (!isDemoMode()) throw new Error("Prototype demo mode is unavailable."); }

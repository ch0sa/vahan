import { Secret, TOTP } from "otpauth";

export const TOTP_PERIOD_SECONDS = 30;
const makeTotp = (base32Secret: string) => new TOTP({ issuer: "MoveKA prototype", label: "prototype account", algorithm: "SHA1", digits: 6, period: TOTP_PERIOD_SECONDS, secret: Secret.fromBase32(base32Secret) });
export function createTotpEnrollment() {
  const secret = new Secret({ size: 20 }).base32;
  return { secret, uri: makeTotp(secret).toString() };
}
export function currentStep(now = Date.now()) { return Math.floor(now / 1000 / TOTP_PERIOD_SECONDS); }
export function generateTotp(secret: string, now = Date.now()) { return makeTotp(secret).generate({ timestamp: now }); }
export function validateTotp(secret: string, code: string, now = Date.now()) {
  return makeTotp(secret).validate({ token: code, timestamp: now, window: 1 });
}

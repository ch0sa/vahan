import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const key = (value: string) => {
  const decoded = Buffer.from(value, "base64");
  if (decoded.length !== 32) throw new Error("Identity configuration is unavailable.");
  return decoded;
};
export function encryptSecret(secret: string, encryptionKey: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(encryptionKey), iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return { encryptedSecret: Buffer.concat([encrypted, cipher.getAuthTag()]).toString("base64"), encryptionIv: iv.toString("base64") };
}
export function decryptSecret(ciphertext: string, ivValue: string, encryptionKey: string) {
  const payload = Buffer.from(ciphertext, "base64");
  const decipher = createDecipheriv("aes-256-gcm", key(encryptionKey), Buffer.from(ivValue, "base64"));
  decipher.setAuthTag(payload.subarray(-16));
  return Buffer.concat([decipher.update(payload.subarray(0, -16)), decipher.final()]).toString("utf8");
}
export function hashOpaqueToken(token: string, sessionHashKey: string) {
  return createHmac("sha256", sessionHashKey).update(token).digest("hex");
}
export function randomOpaqueToken() { return randomBytes(32).toString("base64url"); }
export function safeEqual(left: string, right: string) {
  const a = Buffer.from(left); const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

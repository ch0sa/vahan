import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MAX_DEMO_PASSWORD_LENGTH, validDemoSharedPassword } from "./config";

describe("shared citizen demo password", () => {
  it("fails closed outside demo mode and rejects a wrong or oversized password", () => {
    const mode = process.env.DEMO_MODE; const configured = process.env.DEMO_SHARED_PASSWORD;
    try {
      process.env.DEMO_MODE = "true"; process.env.DEMO_SHARED_PASSWORD = "admin";
      expect(validDemoSharedPassword("admin")).toBe(true);
      expect(validDemoSharedPassword("wrong")).toBe(false);
      expect(validDemoSharedPassword("x".repeat(MAX_DEMO_PASSWORD_LENGTH + 1))).toBe(false);
      process.env.DEMO_MODE = "false";
      expect(validDemoSharedPassword("admin")).toBe(false);
    } finally { process.env.DEMO_MODE = mode; process.env.DEMO_SHARED_PASSWORD = configured; }
  });
  it("keeps the citizen allowlist separate from operator bootstrap and never persists or logs the password", () => {
    const actions = readFileSync("app/auth/actions.ts", "utf8");
    const signIn = readFileSync("app/auth/sign-in/page.tsx", "utf8");
    expect(actions).toContain('z.enum(["synthetic-ananya-rao", "synthetic-rahul-shetty"])');
    expect(actions).toContain("validDemoSharedPassword");
    expect(actions).not.toContain("createSession({ password");
    expect(actions).not.toMatch(/console\.(log|error).*password/i);
    expect(signIn).not.toContain("synthetic-demo-operator");
  });
  it("removes TOTP controls from the citizen golden path while retaining authenticated server actions", () => {
    for (const file of ["app/auth/sign-in/page.tsx", "app/account/page.tsx", "app/seller/page.tsx", "app/buyer/page.tsx", "e2e/golden-path.spec.ts"]) {
      const source = readFileSync(file, "utf8");
      expect(source).not.toContain("Authenticator code");
      expect(source).not.toContain("generateTotp");
    }
    expect(readFileSync("app/seller/actions.ts", "utf8")).toContain("requireCurrentSession");
    expect(readFileSync("app/buyer/actions.ts", "utf8")).toContain("requireCurrentSession");
  });
});

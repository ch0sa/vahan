import { describe, expect, it } from "vitest";
import { canDispatchGovernmentOutbox, canUseDemoBackoffice, cooldownActive } from "./operator-policy";
describe("synthetic operator policy", () => {
  it("requires demo mode and the distinct operator role", () => { expect(canUseDemoBackoffice({ demoMode: true, role: "DEMO_OPERATOR" })).toBe(true); expect(canUseDemoBackoffice({ demoMode: true, role: "CITIZEN" })).toBe(false); expect(canUseDemoBackoffice({ demoMode: false, role: "DEMO_OPERATOR" })).toBe(false); });
  it("allows only eligible government-submit outbox work", () => { expect(canDispatchGovernmentOutbox({ kind: "GOVERNMENT_CASE_SUBMIT", status: "PENDING" })).toBe(true); expect(canDispatchGovernmentOutbox({ kind: "PAYMENT_CREATE_REQUESTED", status: "PENDING" })).toBe(false); expect(canDispatchGovernmentOutbox({ kind: "GOVERNMENT_CASE_SUBMIT", status: "SUCCEEDED" })).toBe(false); });
  it("enforces the cooldown boundary", () => { expect(cooldownActive(1_000, 5_999)).toBe(true); expect(cooldownActive(1_000, 6_000)).toBe(false); });
});

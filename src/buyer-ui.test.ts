import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { buyerNotice, buyerNotificationHref, buyerText } from "./buyer-ui";
describe("buyer route localization",()=>{
  it("keeps buyer and notification keys aligned",()=>expect(Object.keys(buyerText.en).sort()).toEqual(Object.keys(buyerText.kn).sort()));
  it("maps known and historic notification content safely",()=>{expect(buyerNotice("en","You have been invited")).toBe("Your synthetic action is ready.");expect(buyerNotice("kn","unrecognized persisted text")).toBe(buyerText.kn.notice);});
  it("contains structured checklist labels rather than a raw data label",()=>{expect(buyerText.en.evidence).toBeTruthy();expect(buyerText.kn.provenance).toBeTruthy();});
  it("preserves only participant-scoped local resume links",()=>{expect(buyerNotificationHref("app-1","/buyer/payment?application=app-1")).toBe("/buyer/payment?application=app-1");expect(buyerNotificationHref("app-1","https://example.com")).toBe("/case?application=app-1");expect(buyerNotificationHref(null,"javascript:alert(1)")).toBeNull();});
  it("keeps payment recovery states in the buyer payment workspace",()=>{const source=readFileSync("app/buyer/page.tsx","utf8");expect(source).toContain('"PAYMENT_FAILED"');expect(source).toContain('"PAYMENT_RECONCILIATION_REQUIRED"');expect(source).toContain('"PAYMENT_CONFIRMED"');});
});

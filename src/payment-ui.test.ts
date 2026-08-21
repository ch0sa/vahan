import { describe, expect, it } from "vitest";import { readFileSync } from "node:fs";
import { paymentStatusLabel, paymentText } from "./payment-ui";
import { stateLabel } from "./i18n";
describe("payment route localization",()=>{
  it("keeps payment keys aligned",()=>expect(Object.keys(paymentText.en).sort()).toEqual(Object.keys(paymentText.kn).sort()));
  it("has safe payment and workflow status copy",()=>{expect(paymentText.en.disclosure).toMatch(/No money will be charged/);expect(paymentText.kn.reconcile).toBeTruthy();expect(stateLabel("en","PAYMENT_RECONCILIATION_REQUIRED")).not.toBe("PAYMENT_RECONCILIATION_REQUIRED");});
  it("maps every payment status without raw enum display",()=>{for(const locale of ["en","kn"] as const)for(const status of ["REQUESTED","PENDING","FAILED","CONFIRMED","RECONCILIATION_REQUIRED"])expect(paymentStatusLabel(locale,status)).not.toBe(status);expect(readFileSync("app/buyer/payment/page.tsx","utf8")).toMatch(/paymentStatusLabel\(locale,\s*payment\.status\)/);});
});

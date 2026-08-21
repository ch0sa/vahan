import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("citizen journey shell", () => {
  it("routes payment-state buyers and post-seller handoff safely", () => {
    const navigation = readFileSync("src/workspace/navigation.ts", "utf8");
    expect(navigation).toContain('"PAYMENT_RECONCILIATION_REQUIRED"');
    expect(navigation).toContain('`/buyer/payment?application=${application.id}`');
    expect(navigation).toContain('application.state === "BUYER_ACTION_REQUIRED"');
    expect(navigation).toContain('href: "/demo-helper"');
    expect(navigation).toContain('`/case?application=${application.id}`');
  });
  it("keeps authenticated switching and sign-out reachable", () => {
    const layout = readFileSync("app/layout.tsx", "utf8");
    const account = readFileSync("app/account/page.tsx", "utf8");
    expect(layout).toContain('href="/demo-helper"');
    expect(layout).toContain("action={signOut}");
    expect(account).toContain('href="/demo-helper"');
    expect(account).toContain("action={signOut}");
  });
  it("offers one citizen payment completion action and formats minor units", () => {
    const page = readFileSync("app/buyer/payment/page.tsx", "utf8");
    expect(page).toContain("completeDemoPayment");
    expect(page).not.toContain("initiatePayment");
    expect(page).not.toContain("checkPaymentStatus");
    expect(page).toContain("amountMinor / 100");
  });
  it("makes seller-to-buyer account handoff explicit", () => {
    const seller = readFileSync("app/seller/page.tsx", "utf8");
    expect(seller).toContain('app.state === "BUYER_ACTION_REQUIRED"');
    expect(seller).toContain('href="/demo-helper"');
  });
});

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("citizen journey UX", () => {
  it("keeps primary destinations visible on mobile and exposes account controls", () => {
    const layout = read("app/layout.tsx");
    const css = read("app/globals.css");
    expect(layout).toContain('className="mobile-nav"');
    for (const destination of ['href="/"', 'href="/services"', 'href="/dashboard"', 'href="/account"']) expect(layout).toContain(destination);
    expect(layout).toContain("Switch account");
    expect(layout).toContain("signOut");
    expect(css).toMatch(/\.mobile-nav\s*\{\s*display:none/);
    expect(css).toMatch(/@media \(max-width: 900px\)[\s\S]*?\.mobile-nav\{display:grid/);
  });

  it("offers one explicit citizen demo-payment path and removes legacy provider controls", () => {
    const page = read("app/buyer/payment/page.tsx");
    expect(page).toContain("completeDemoPayment");
    expect(page).toContain('className="demo-note"');
    expect(page).not.toContain("createPayment,");
    expect(page).not.toContain("initiatePayment,");
    expect(page).not.toContain("checkPaymentStatus,");
  });

  it("preserves submission evidence when the fake payment completes", () => {
    const flow = read("src/domain/payment-flow.ts");
    expect(flow).toContain("CompleteSyntheticDemoPayment");
    expect(flow).toContain('status:"CONFIRMED"');
    expect(flow).toContain('status:"RESOLVED_CONFIRMED"');
    expect(flow).toContain("COMPLETE_SYNTHETIC_DEMO_PAYMENT");
  });

  it("gives every ownership-transfer screen a consistent journey frame", () => {
    for (const route of ["app/seller/page.tsx", "app/buyer/page.tsx", "app/buyer/payment/page.tsx", "app/case/page.tsx"]) {
      const page = read(route);
      expect(page).toContain('className="page-shell"');
      expect(page).toContain('className="journey-stepper"');
      expect(page).toContain("Dashboard");
    }
  });

  it("lets a participant finish the demo without an operator console", () => {
    const page = read("app/case/page.tsx");
    const action = read("app/case/actions.ts");
    expect(page).toContain("Complete demo journey");
    expect(action).toContain("DemoCompletionService");
    expect(page).not.toContain("synthetic case status");
  });
});

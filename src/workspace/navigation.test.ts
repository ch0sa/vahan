import { describe, expect, it } from "vitest";
import { dashboardDestination, selectedWorkspaceDestination } from "./navigation";

describe("workspace selection resume routing", () => {
  it("routes a buyer invited into a selected workspace to the buyer step", () => {
    expect(selectedWorkspaceDestination("synthetic-rahul-shetty", { id: "app-1", state: "BUYER_ACTION_REQUIRED", participantRole: "BUYER" })).toBe("/buyer?application=app-1");
  });
  it("routes a buyer payment workspace directly to payment and a seller workspace to seller work", () => {
    expect(selectedWorkspaceDestination("synthetic-rahul-shetty", { id: "app-1", state: "PAYMENT_CONFIRMED", participantRole: "BUYER" })).toBe("/buyer/payment?application=app-1");
    expect(selectedWorkspaceDestination("synthetic-ananya-rao", { id: "app-1", state: "SELLER_ACTION_REQUIRED", participantRole: "SELLER" })).toBe("/seller?application=app-1");
  });
  it("never derives a route from a workspace without a participant journey", () => {
    expect(selectedWorkspaceDestination("synthetic-rahul-shetty", null)).toBe("/buyer");
  });
});

describe("dashboard next action", () => {
  it("sends a waiting seller to the account switcher instead of the case tracker", () => {
    expect(dashboardDestination("CITIZEN", "synthetic-ananya-rao", { id: "app-1", state: "BUYER_ACTION_REQUIRED" })).toEqual({ href: "/demo-helper", action: "Switch to Rahul’s demo account" });
  });

  it("resumes the buyer directly at payment and keeps the operator separate", () => {
    expect(dashboardDestination("CITIZEN", "synthetic-rahul-shetty", { id: "app-1", state: "PAYMENT_REQUIRED" })).toEqual({ href: "/buyer/payment?application=app-1", action: "Complete payment" });
    expect(dashboardDestination("DEMO_OPERATOR", "synthetic-demo-operator", null)).toEqual({ href: "/demo/backoffice", action: "Review demo operations" });
  });
});

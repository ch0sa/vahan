import { describe, expect, it } from "vitest";
import { classifyExternalEvent } from "./events";
import { transition } from "./workflow";

describe("transfer workflow guards", () => {
  it("allows the seller-first handoff and forbids a buyer starting it", () => {
    expect(transition({ state: "DRAFT", command: "START_SELLER_STEP", actor: "SELLER" })).toMatchObject({ allowed: true, next: "SELLER_ACTION_REQUIRED" });
    expect(transition({ state: "DRAFT", command: "START_SELLER_STEP", actor: "BUYER" })).toMatchObject({ allowed: false });
  });
  it("keeps approval distinct from registry completion", () => {
    expect(transition({ state: "RTO_PROCESSING", command: "EXTERNAL_APPROVED", actor: "DEMO_OPERATOR" })).toMatchObject({ allowed: true, next: "APPROVED" });
    expect(transition({ state: "RTO_PROCESSING", command: "EXTERNAL_REGISTRY_COMPLETE", actor: "DEMO_OPERATOR" })).toMatchObject({ allowed: false });
  });
  it("treats duplicate and stale external events as non-mutating", () => {
    const duplicate = classifyExternalEvent({ source: "mock-rto", externalEventId: "event-1", sequence: 4, aggregateVersion: 4, kind: "APPROVED" }, new Set(["mock-rto:event-1"]), 3, "RTO_PROCESSING");
    const stale = classifyExternalEvent({ source: "mock-rto", externalEventId: "event-2", sequence: 3, aggregateVersion: 3, kind: "INWARDED" }, new Set(), 4, "APPROVED");
    expect(duplicate).toBe("DUPLICATE");
    expect(stale).toBe("STALE");
  });
  it("moves ambiguous payment into reconciliation and resolves only through a mock authority", () => {
    expect(transition({ state: "PAYMENT_PENDING", command: "EXTERNAL_PAYMENT_AMBIGUOUS", actor: "DEMO_OPERATOR" })).toMatchObject({ allowed: true, next: "PAYMENT_RECONCILIATION_REQUIRED" });
    expect(transition({ state: "PAYMENT_RECONCILIATION_REQUIRED", command: "EXTERNAL_RECONCILIATION_CONFIRMED", actor: "BUYER" })).toMatchObject({ allowed: false });
    expect(transition({ state: "PAYMENT_RECONCILIATION_REQUIRED", command: "EXTERNAL_RECONCILIATION_CONFIRMED", actor: "DEMO_OPERATOR" })).toMatchObject({ allowed: true, next: "PAYMENT_CONFIRMED" });
  });
  it("lets the buyer, not the seller, submit after confirmed payment", () => {
    expect(transition({ state: "PAYMENT_CONFIRMED", command: "SUBMIT_APPLICATION", actor: "SELLER" })).toMatchObject({ allowed: false });
    expect(transition({ state: "PAYMENT_CONFIRMED", command: "SUBMIT_APPLICATION", actor: "BUYER" })).toMatchObject({ allowed: true, next: "SUBMITTED" });
  });
  it("returns a submitted correction to processing only after an external acknowledgement", () => {
    expect(transition({ state: "CORRECTION_REQUIRED", command: "SUBMIT_CORRECTION", actor: "BUYER" })).toMatchObject({ allowed: true, next: "CORRECTION_REQUIRED" });
    expect(transition({ state: "CORRECTION_REQUIRED", command: "ACKNOWLEDGE_CORRECTION", actor: "BUYER" })).toMatchObject({ allowed: false });
    expect(transition({ state: "CORRECTION_REQUIRED", command: "ACKNOWLEDGE_CORRECTION", actor: "DEMO_OPERATOR" })).toMatchObject({ allowed: true, next: "RTO_PROCESSING" });
  });
  it("requires external confirmation before withdrawal becomes terminal", () => {
    expect(transition({ state: "SUBMITTED", command: "REQUEST_WITHDRAWAL", actor: "BUYER" })).toMatchObject({ allowed: true, next: "WITHDRAWAL_PENDING" });
    expect(transition({ state: "WITHDRAWAL_PENDING", command: "EXTERNAL_WITHDRAWAL_CONFIRMED", actor: "BUYER" })).toMatchObject({ allowed: false });
    expect(transition({ state: "WITHDRAWAL_PENDING", command: "EXTERNAL_WITHDRAWAL_CONFIRMED", actor: "DEMO_OPERATOR" })).toMatchObject({ allowed: true, next: "WITHDRAWN_EXTERNALLY_CONFIRMED" });
  });
});

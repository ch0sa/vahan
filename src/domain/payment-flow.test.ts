import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { isLegalProviderEvent, outboxClaimDisposition, paymentEventDisposition, providerEventSchema, syntheticPricing, validateSubmissionEvidence } from "./payment-flow";
import { buyerInformationContentHash, buyerStatement, deterministicBuyerDocuments, deterministicBuyerInformation } from "./buyer-flow";
describe("synthetic payment contracts", () => {
  it("is explicitly synthetic and never an official fee", () => expect(syntheticPricing.label).toMatch(/not an official fee/i));
  it("orders, deduplicates, quarantines, and defers provider sequences", () => { expect(paymentEventDisposition({ incomingSequence: 1, knownSequence: 2, incomingHash: "a" })).toBe("STALE"); expect(paymentEventDisposition({ incomingSequence: 2, knownSequence: 2, sameSequenceHash: "a", incomingHash: "a" })).toBe("DUPLICATE"); expect(paymentEventDisposition({ incomingSequence: 2, knownSequence: 2, sameSequenceHash: "a", incomingHash: "b" })).toBe("QUARANTINED"); expect(paymentEventDisposition({ incomingSequence: 3, knownSequence: 2, incomingHash: "a" })).toBe("APPLIED"); expect(paymentEventDisposition({ incomingSequence: 5, knownSequence: 2, incomingHash: "a" })).toBe("PENDING"); });
  it("boundedly re-drives the next contiguous pending callback", () => { const source = readFileSync("src/domain/payment-flow.ts", "utf8"); expect(source).toContain("drainContiguousPending"); expect(source).toContain("limit = 25"); expect(source).toContain("(applied?.sequence ?? 0) + 1"); });
  it("accepts no application or payment ID from a provider callback", () => { expect(providerEventSchema.safeParse({ source: "MOCK_PAYMENT_PROVIDER", externalEventId: "evt-1", providerReference: "provider-1", kind: "PENDING", payloadVersion: "payment-event-v1", sequence: 1, payload: {} }).success).toBe(true); });
  it("rejects malformed callback envelopes instead of inferring a payment target", () => {
    expect(providerEventSchema.safeParse({ source: "MOCK_PAYMENT_PROVIDER", externalEventId: "evt-1", kind: "CONFIRMED", payloadVersion: "payment-event-v1", sequence: 1 }).success).toBe(false);
  });
  it("keeps confirmed attempts terminal and gates reconciliation evidence", () => {
    expect(isLegalProviderEvent("CONFIRMED", "PENDING", false)).toBe(false);
    expect(isLegalProviderEvent("PENDING", "CONFIRMED", false)).toBe(true);
    expect(isLegalProviderEvent("RECONCILIATION_REQUIRED", "RECONCILIATION_CONFIRMED", false)).toBe(false);
    expect(isLegalProviderEvent("RECONCILIATION_REQUIRED", "RECONCILIATION_CONFIRMED", true)).toBe(true);
  });
  it("requires exact untampered pinned buyer and seller evidence before pricing", () => {
    const info = { id: "info", version: "buyer-synthetic-v1", data: deterministicBuyerInformation, documentChecklist: deterministicBuyerDocuments, provenanceVersion: "seed-v1", disclosureVersion: "prototype-disclosure-v1", contentHash: buyerInformationContentHash({ version: "buyer-synthetic-v1", data: deterministicBuyerInformation, documentChecklist: deterministicBuyerDocuments, provenanceVersion: "seed-v1", disclosureVersion: "prototype-disclosure-v1" }) };
    const valid = { application: { ruleBodyHash: "rule", serviceRuleId: "rule-id" }, buyerInformation: info, buyerDeclaration: { buyerInformationId: "info", statementVersion: "buyer-prototype-v1", statementSnapshot: buyerStatement }, sellerDeclaration: { readinessResultId: "ready" }, readinessResults: [{ id: "ready", status: "READY_FOR_DEMO", ruleBodyHash: "rule" }] };
    expect(validateSubmissionEvidence(valid)).toBe(true);
    expect(validateSubmissionEvidence({ ...valid, buyerInformation: { ...info, documentChecklist: [] } })).toBe(false);
    expect(validateSubmissionEvidence({ ...valid, buyerDeclaration: { ...valid.buyerDeclaration, buyerInformationId: "other" } })).toBe(false);
    expect(validateSubmissionEvidence({ ...valid, sellerDeclaration: { readinessResultId: "stale" } })).toBe(false);
    expect(validateSubmissionEvidence({ ...valid, application: { ...valid.application, ruleBodyHash: "wrong" } })).toBe(false);
  });
  it("claims only due pending work or an expired lease", () => {
    expect(outboxClaimDisposition({ status: "PENDING", nextAttemptAt: 1, now: 1 })).toBe("CLAIM");
    expect(outboxClaimDisposition({ status: "PROCESSING", nextAttemptAt: 1, leaseUntil: 1, now: 2 })).toBe("RECOVER_LEASE");
    expect(outboxClaimDisposition({ status: "PROCESSING", nextAttemptAt: 1, leaseUntil: 3, now: 2 })).toBe("SKIP");
    expect(outboxClaimDisposition({ status: "SUCCEEDED", nextAttemptAt: 1, now: 2 })).toBe("SKIP");
  });
  it("keeps the one-click demo payment path compatible with submission", () => {
    const source = readFileSync("src/domain/payment-flow.ts", "utf8");
    expect(source).toContain('status:"CONFIRMED",safeCode:"SYNTHETIC_DEMO_CONFIRMED"');
    expect(source).toContain('status:"RESOLVED_CONFIRMED"');
    expect(source).toContain("payment.attempts.find");
  });
});

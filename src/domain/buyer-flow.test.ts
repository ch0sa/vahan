import { describe, expect, it } from "vitest";
import { UserRole } from "@prisma/client";
import { buyerInformationContentHash, canInviteSyntheticBuyer, deterministicBuyerDocuments, deterministicBuyerInformation, sellerReadinessIsCurrentAndReady, syntheticBuyerId, syntheticDocumentsComplete } from "./buyer-flow";
import { transition } from "./workflow";

describe("synthetic buyer handoff rules", () => {
  it("uses only the fixed synthetic buyer information and deterministic evidence", () => {
    expect(syntheticBuyerId).toBe("synthetic-rahul-shetty");
    expect(deterministicBuyerInformation).toEqual({ displayName: "Rahul Shetty", scenario: "synthetic-buyer-v1" });
    expect(syntheticDocumentsComplete(deterministicBuyerDocuments)).toBe(true);
    expect(syntheticDocumentsComplete([{ status: "ATTACHED_FOR_DEMO", provenance: "untrusted upload" }])).toBe(false);
  });

  it("keeps the seller-before-buyer sequence under the active citizen session", () => {
    expect(transition({ state: "SELLER_VERIFIED", command: "INVITE_BUYER", actor: "BUYER" }).allowed).toBe(false);
    expect(transition({ state: "SELLER_VERIFIED", command: "INVITE_BUYER", actor: "SELLER" })).toEqual({ allowed: true, next: "BUYER_ACTION_REQUIRED" });
    expect(transition({ state: "BUYER_ACTION_REQUIRED", command: "COMPLETE_BUYER_ACCEPTANCE", actor: "SELLER" }).allowed).toBe(false);
    expect(transition({ state: "BUYER_ACTION_REQUIRED", command: "COMPLETE_BUYER_ACCEPTANCE", actor: "BUYER" })).toEqual({ allowed: true, next: "BUYER_VERIFIED" });
  });

  it("requires a citizen recorded seller and denies an operator participant", () => {
    expect(canInviteSyntheticBuyer(UserRole.CITIZEN, true, "synthetic-ananya-rao")).toBe(true);
    expect(canInviteSyntheticBuyer(UserRole.DEMO_OPERATOR, true, "synthetic-operator")).toBe(false);
    expect(canInviteSyntheticBuyer(UserRole.CITIZEN, false, "synthetic-ananya-rao")).toBe(false);
  });

  it("detects tampered buyer snapshot inputs", () => {
    const snapshot = { version: "buyer-synthetic-v1", data: deterministicBuyerInformation, documentChecklist: deterministicBuyerDocuments, provenanceVersion: "seed-v1", disclosureVersion: "prototype-disclosure-v1" };
    expect(buyerInformationContentHash(snapshot)).not.toBe(buyerInformationContentHash({ ...snapshot, documentChecklist: [] }));
    expect(sellerReadinessIsCurrentAndReady({ currentReadinessId: "ready-1", declaredReadinessId: "ready-1", status: "READY_FOR_DEMO", ruleBodyHash: "rule-1", pinnedRuleBodyHash: "rule-1" })).toBe(true);
    expect(sellerReadinessIsCurrentAndReady({ currentReadinessId: "ready-2", declaredReadinessId: "ready-1", status: "READY_FOR_DEMO", ruleBodyHash: "rule-1", pinnedRuleBodyHash: "rule-1" })).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { journeyProgress } from "./journey-progress";

describe("server-derived journey progress", () => {
  it("maps every workflow band without route-local percentages", () => {
    expect(journeyProgress("DRAFT")).toMatchObject({ step: "SELLER", percent: 20, terminal: false });
    expect(journeyProgress("BUYER_ACTION_REQUIRED")).toMatchObject({ step: "BUYER", percent: 42 });
    expect(journeyProgress("PAYMENT_CONFIRMED")).toMatchObject({ step: "PAYMENT", percent: 70 });
    expect(journeyProgress("SENT_TO_RTO")).toMatchObject({ step: "CASE", percent: 82 });
  });
  it("distinguishes completed, rejected, and withdrawn terminal records", () => {
    expect(journeyProgress("REGISTRY_UPDATE_COMPLETE")).toMatchObject({ terminal: true, outcome: "COMPLETED", nextAction: "START_ANOTHER", percent: 100 });
    expect(journeyProgress("REJECTED")).toMatchObject({ terminal: true, outcome: "REJECTED" });
    expect(journeyProgress("WITHDRAWN_EXTERNALLY_CONFIRMED")).toMatchObject({ terminal: true, outcome: "WITHDRAWN" });
  });
});

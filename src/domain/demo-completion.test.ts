import { describe, expect, it } from "vitest";
import { demoJourneyStep } from "./demo-completion";

describe("demo journey", () => {
  it("maps the full post-submission happy path", () => {
    expect(demoJourneyStep("SUBMITTED")).toBe("DISPATCH");
    expect(demoJourneyStep("SENT_TO_RTO")).toBe("INWARD");
    expect(demoJourneyStep("RTO_PROCESSING")).toBe("APPROVE");
    expect(demoJourneyStep("APPROVED")).toBe("COMPLETE");
    expect(demoJourneyStep("REGISTRY_UPDATE_COMPLETE")).toBe("DONE");
    expect(demoJourneyStep("WITHDRAWAL_PENDING")).toBe("RESUME");
    expect(demoJourneyStep("REJECTED")).toBeNull();
  });
});

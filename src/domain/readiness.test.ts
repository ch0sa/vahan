import { describe, expect, it } from "vitest";
import { evaluateReadiness } from "./readiness";

const rule = { scenario: "KA01AB1234", owner: "synthetic-ananya-rao", source: "MOCK_VEHICLE_REGISTRY" };
describe("synthetic readiness", () => {
  it("is ready only for the exact seeded synthetic scenario", () => {
    expect(evaluateReadiness({ registrationNumber: "KA01AB1234", ownerId: "synthetic-ananya-rao", source: "MOCK_VEHICLE_REGISTRY", sourceVersion: "seed-v1", vehicleClass: "PRIVATE_NON_TRANSPORT", registrationState: "KA" }, rule)).toMatchObject({ status: "READY_FOR_DEMO", processingMode: "DEMO_RTO_HANDOVER" });
  });
  it("keeps unsupported or malformed projections unknown", () => {
    expect(evaluateReadiness({ registrationNumber: "KA01ZZ9999" }, rule)).toMatchObject({ status: "UNKNOWN" });
  });
  it("blocks a known mismatched synthetic owner without claiming official eligibility", () => {
    expect(evaluateReadiness({ registrationNumber: "KA01AB1234", ownerId: "synthetic-rahul-shetty", source: "MOCK_VEHICLE_REGISTRY", sourceVersion: "seed-v1", vehicleClass: "PRIVATE_NON_TRANSPORT", registrationState: "KA" }, rule)).toMatchObject({ status: "BLOCKED_FOR_DEMO" });
  });
  it("hashes equivalent rule snapshots consistently after JSONB key reordering", () => {
    const reordered = { source: "MOCK_VEHICLE_REGISTRY", owner: "synthetic-ananya-rao", scenario: "KA01AB1234" };
    expect(evaluateReadiness({}, reordered).ruleBodyHash).toBe(evaluateReadiness({}, rule).ruleBodyHash);
  });
});

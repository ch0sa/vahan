import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("deterministic seed contracts", () => {
  it("gives the fixture a stable id and resolves seller drafts by registration", () => {
    const seed = readFileSync("prisma/seed.ts", "utf8");
    const sellerActions = readFileSync("app/seller/actions.ts", "utf8");
    expect(seed).toContain('id: "synthetic-vehicle-ka01ab1234"');
    expect(sellerActions).toContain('registrationNumber: "KA01AB1234"');
    expect(sellerActions).toContain("vehicleId: vehicle.id");
  });
});

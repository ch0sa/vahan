import { describe, expect, it } from "vitest";
import { stableIntentKey } from "./intent";

describe("stable command intents", () => {
  const base = { actorId: "synthetic-ananya-rao", scope: "application:case-1", command: "InviteBuyer", aggregateVersion: 3 };
  it("is stable for the same command and aggregate version", () => {
    expect(stableIntentKey(base)).toBe(stableIntentKey({ ...base }));
  });
  it("changes with command or expected aggregate version", () => {
    expect(stableIntentKey(base)).not.toBe(stableIntentKey({ ...base, command: "CompleteBuyerAcceptance" }));
    expect(stableIntentKey(base)).not.toBe(stableIntentKey({ ...base, aggregateVersion: 4 }));
  });
});

import { describe, expect, it } from "vitest";
import { findingLabel, friendlyState, sellerText, stateLabel } from "./i18n";

describe("seller route localization", () => {
  it("keeps seller dictionary keys aligned", () => expect(Object.keys(sellerText.en).sort()).toEqual(Object.keys(sellerText.kn).sort()));
  it("maps seller readiness findings and workflow states without exposing codes", () => {
    for (const locale of ["en", "kn"] as const) {
      expect(findingLabel(locale, "SYNTHETIC_SCENARIO_READY")).not.toBe("SYNTHETIC_SCENARIO_READY");
      expect(stateLabel(locale, "SELLER_ACTION_REQUIRED")).toBe(friendlyState[locale].SELLER_ACTION_REQUIRED);
    }
  });
});

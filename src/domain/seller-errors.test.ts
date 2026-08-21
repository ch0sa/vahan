import { describe, expect, it } from "vitest";
import { sellerErrorCode, sellerErrorMessage } from "./seller-errors";
describe("seller error allowlist", () => {
  it("maps expected failures to safe actionable copy", () => {
    expect(sellerErrorCode(new Error("Vehicle projection is unavailable"))).toBe("registry-unavailable");
    expect(sellerErrorMessage("totp-retry")).toMatch(/new code/i);
    expect(sellerErrorMessage("not-allowed")).toBeUndefined();
  });
});

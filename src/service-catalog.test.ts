import { describe, expect, it } from "vitest";
import { citizenServices, serviceCategories, serviceBySlug } from "./service-catalog";

describe("research-backed citizen service catalogue", () => {
  it("contains the complete observed five-category, 21-service Karnataka catalogue", () => {
    expect(serviceCategories).toHaveLength(5);
    expect(citizenServices).toHaveLength(21);
    expect(new Set(citizenServices.map((service) => service.slug)).size).toBe(21);
  });

  it("only presents implemented routes as working demos", () => {
    const working = citizenServices.filter((service) => service.availability === "working-demo");
    expect(working.map((service) => service.slug)).toEqual(["transfer-ownership-seller", "transfer-ownership-buyer"]);
    expect(working.every((service) => service.actionHref?.startsWith("/"))).toBe(true);
  });

  it("keeps government-only functions as bounded guidance", () => {
    expect(serviceBySlug("update-mobile")).toMatchObject({ availability: "guided-preview" });
    expect(serviceBySlug("update-mobile")?.actionHref).toBeUndefined();
    expect(serviceBySlug("pay-tax")?.summary).toMatch(/without collecting bank or card details/i);
    expect(serviceBySlug("seller-esign")?.summary).toMatch(/not a government eSign/i);
  });
});

import { describe, expect, it } from "vitest";
import { dictionary, locales } from "./i18n";
describe("prototype locale dictionaries", () => {
  it("has the same critical keys in every locale", () => { const keys = Object.keys(dictionary.en).sort(); for (const locale of locales) expect(Object.keys(dictionary[locale]).sort()).toEqual(keys); });
  it("keeps the synthetic/non-authoritative disclosure in both locales", () => { for (const locale of locales) expect(dictionary[locale].synthetic.length).toBeGreaterThan(20); });
});

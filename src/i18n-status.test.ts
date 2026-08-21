import { describe, expect, it } from "vitest"; import { friendlyState } from "./i18n";
describe("friendly workflow status labels",()=>it("maps the same states in both locales",()=>expect(Object.keys(friendlyState.en).sort()).toEqual(Object.keys(friendlyState.kn).sort())));

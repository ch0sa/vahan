import { describe, expect, it } from "vitest";
import { routeText } from "./i18n";
describe("home and authentication locale content",()=>it("keeps all route-A keys aligned",()=>expect(Object.keys(routeText.en).sort()).toEqual(Object.keys(routeText.kn).sort())));

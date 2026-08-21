import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { caseText, correctionExplanation, eventLabel } from "./case-ui";
import { friendlyState } from "./i18n";
describe("case localization",()=>{
 it("keeps case keys and workflow labels aligned",()=>{expect(Object.keys(caseText.en).sort()).toEqual(Object.keys(caseText.kn).sort());expect(Object.keys(friendlyState.en).sort()).toEqual(Object.keys(friendlyState.kn).sort());});
 it("maps known event families without exposing enum values",()=>{for(const locale of ["en","kn"] as const){expect(eventLabel(locale,"CORRECTION_REQUESTED")).not.toContain("CORRECTION_REQUESTED");expect(eventLabel(locale,"WITHDRAWAL_CONFIRMED")).not.toContain("WITHDRAWAL_CONFIRMED");}});
 it("does not render raw workflow/inbox internals",()=>{const source=readFileSync("app/case/page.tsx","utf8");expect(source).not.toContain("event.disposition");expect(source).not.toContain("JSON.stringify");expect(source).not.toContain("<time>{event.version}");});
 it("keeps the buyer payment resume route discoverable",()=>{const source=readFileSync("app/case/page.tsx","utf8");expect(source).toContain("/buyer/payment?application=");expect(caseText.kn.payment).toBeTruthy();});
 it("localizes bounded correction explanations",()=>expect(correctionExplanation("kn","SYNTHETIC_CORRECTION_REQUIRED")).not.toMatch(/synthetic correction/i));
});

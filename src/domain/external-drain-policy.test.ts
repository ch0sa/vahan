import { describe,expect,it } from "vitest";import { drainBudget,nextContiguousSequence } from "./external-drain-policy";
describe("external event bounded drain policy",()=>it("advances one sequence and stops at budget",()=>{expect(nextContiguousSequence(4)).toBe(5);expect(drainBudget(25,24)).toBe(true);expect(drainBudget(25,25)).toBe(false);}));

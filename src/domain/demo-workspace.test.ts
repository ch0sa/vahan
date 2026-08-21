import { describe, expect, it } from "vitest";
import { UserRole } from "@prisma/client";
import { canManageDemoWorkspace, demoWorkspaceLabel, workspaceReceiptScope } from "./demo-workspace";

describe("demo workspace isolation policy", () => {
  it("requires a citizen membership before a workspace can be created or reset", () => {
    expect(canManageDemoWorkspace({ userRole: UserRole.CITIZEN, isMember: true })).toBe(true);
    expect(canManageDemoWorkspace({ userRole: UserRole.CITIZEN, isMember: false })).toBe(false);
    expect(canManageDemoWorkspace({ userRole: UserRole.DEMO_OPERATOR, isMember: true })).toBe(false);
  });
  it("makes receipts workspace-specific so multiple runs cannot collide", () => {
    expect(workspaceReceiptScope("one")).not.toBe(workspaceReceiptScope("two"));
  });
  it("gives repeated runs a stable friendly label derived from each workspace id", () => {
    expect(demoWorkspaceLabel("workspace-aaa111")).toBe("Demo journey AAA111");
    expect(demoWorkspaceLabel("workspace-bbb222")).toBe("Demo journey BBB222");
  });
});

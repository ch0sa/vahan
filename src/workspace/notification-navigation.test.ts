import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { notificationApplicationDestination } from "./notification-navigation";

describe("notification workspace handoff", () => {
  it("moves a buyer pinned to workspace A into the invited application workspace B", () => {
    expect(notificationApplicationDestination("synthetic-rahul-shetty", { id: "invitation-b", state: "BUYER_ACTION_REQUIRED", workspaceId: "workspace-b", participantRole: "BUYER" })).toEqual({ workspaceId: "workspace-b", destination: "/buyer?application=invitation-b" });
  });
  it("denies a forged seller/unrelated participant result instead of deriving a destination", () => {
    expect(() => notificationApplicationDestination("synthetic-rahul-shetty", { id: "other", state: "BUYER_ACTION_REQUIRED", workspaceId: "workspace-b", participantRole: "SELLER" })).toThrow("unavailable");
  });
  it("keeps the runtime action participant-scoped and derives its workspace on the server", () => {
    const action = readFileSync("app/buyer/notifications/actions.ts", "utf8");
    expect(action).toContain('participants: { some: { userId: session.userId, role: "BUYER" } }');
    expect(action).toContain("await requireWorkspaceMember(application.workspaceId, session.userId)");
    expect(action).toContain("await setWorkspaceCookie(target.workspaceId)");
    expect(action).not.toContain('formData.get("workspaceId")');
    expect(action).not.toContain('formData.get("destination")');
  });
});

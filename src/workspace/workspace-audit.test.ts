import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("workspace persistence and page scoping", () => {
  it("keeps the forward migration and schema aligned", () => {
    const schema = readFileSync("prisma/schema.prisma", "utf8"); const migration = readFileSync("prisma/migrations/20260821000000_workspace_isolation/migration.sql", "utf8");
    for (const name of ["Workspace", "WorkspaceMembership", "workspaceId"]) { expect(schema).toContain(name); expect(migration).toContain(name); }
    expect(migration).toContain('UPDATE "Application" SET "workspaceId"');
  });
  it("scopes all citizen case queries to the current workspace", () => {
    for (const file of ["app/dashboard/page.tsx", "app/seller/page.tsx", "app/buyer/page.tsx", "app/buyer/payment/page.tsx", "app/case/page.tsx"]) expect(readFileSync(file, "utf8")).toContain("workspaceId");
  });
  it("keeps reset scoped and confirmation-protected", () => {
    const service = readFileSync("src/domain/demo-workspace.ts", "utf8");
    const dashboard = readFileSync("app/dashboard/page.tsx", "utf8");
    expect(service).toContain('confirmation: z.literal("RESET")');
    expect(service).toContain('where: { workspaceId: workspace.id }');
    expect(service).toContain("isMember: workspace.memberships.some");
    expect(dashboard).toContain('type="checkbox" name="confirmation" value="RESET" required');
    expect(dashboard).toContain("Clear the progress in this journey and start again.");
    expect(dashboard).toContain("Your other saved journeys stay unchanged.");
  });
  it("offers only membership-checked workspace selection and a real terminal create action", () => {
    const actions = readFileSync("app/dashboard/actions.ts", "utf8");
    const dashboard = readFileSync("app/dashboard/page.tsx", "utf8");
    expect(actions).toContain("await requireWorkspaceMember(workspaceId, session.userId)");
    expect(actions).toContain("where: { workspaceId, participants");
    expect(actions).toContain("selectedWorkspaceDestination");
    expect(dashboard).toContain("Choose a saved journey");
    expect(dashboard).toContain("Open selected journey");
    expect(dashboard).toContain("dateFormat.format(choice.createdAt)");
    expect(dashboard).toContain('role="alert" aria-live="assertive"');
    expect(dashboard).toContain("Start another journey</SubmitButton>");
    expect(dashboard).not.toContain('progress.terminal ? "/dashboard"');
    for (const file of ["app/seller/page.tsx", "app/buyer/page.tsx", "app/case/page.tsx"]) {
      const route = readFileSync(file, "utf8");
      expect(route).toContain("createNewDemoJourney");
      expect(route).not.toContain('href="/dashboard">Start another journey');
    }
  });
});

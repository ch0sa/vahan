import { prisma } from "@/src/lib/prisma";
import { readWorkspaceCookie } from "@/src/identity/cookies";

export async function currentWorkspaceForUser(userId: string) {
  const selected = await readWorkspaceCookie();
  if (selected) {
    const workspace = await prisma.workspace.findFirst({ where: { id: selected, memberships: { some: { userId } } } });
    if (workspace) return workspace;
  }
  return prisma.workspace.findFirst({ where: { memberships: { some: { userId } } }, orderBy: { updatedAt: "desc" } });
}

export async function requireWorkspaceMember(workspaceId: string, userId: string) {
  const membership = await prisma.workspaceMembership.findUnique({ where: { workspaceId_userId: { workspaceId, userId } } });
  if (!membership) throw new Error("This demo workspace is unavailable.");
  return membership;
}

export async function requireCurrentWorkspaceApplication(applicationId: string, userId: string) {
  const workspace = await currentWorkspaceForUser(userId);
  if (!workspace) throw new Error("This demo workspace is unavailable.");
  const application = await prisma.application.findFirst({ where: { id: applicationId, workspaceId: workspace.id, participants: { some: { userId } } }, select: { id: true } });
  if (!application) throw new Error("This journey is unavailable in the current workspace.");
  return application;
}

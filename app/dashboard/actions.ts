"use server";

import { redirect } from "next/navigation";
import { requireCurrentSession } from "@/src/identity/access";
import { setWorkspaceCookie } from "@/src/identity/cookies";
import { requireDemoMode } from "@/src/identity/config";
import { DemoWorkspaceService } from "@/src/domain/demo-workspace";
import { sellerErrorCode } from "@/src/domain/seller-errors";
import { prisma } from "@/src/lib/prisma";
import { requireWorkspaceMember } from "@/src/workspace/context";
import { selectedWorkspaceDestination } from "@/src/workspace/navigation";

const workspaces = new DemoWorkspaceService(prisma);

export async function createNewDemoJourney(formData: FormData) {
  try {
    requireDemoMode();
    const session = await requireCurrentSession();
    const result = await workspaces.createNewJourney(session.userId, { workspaceId: String(formData.get("workspaceId") ?? ""), idempotencyKey: String(formData.get("intentKey") ?? "") }) as { workspaceId: string };
    await setWorkspaceCookie(result.workspaceId);
  } catch (error) { redirect(`/dashboard?error=${sellerErrorCode(error)}`); }
  redirect("/dashboard");
}

export async function resetCurrentWorkspace(formData: FormData) {
  const workspaceId = String(formData.get("workspaceId") ?? "");
  try {
    requireDemoMode();
    const session = await requireCurrentSession();
    await workspaces.resetWorkspace(session.userId, { workspaceId, confirmation: String(formData.get("confirmation") ?? ""), idempotencyKey: String(formData.get("intentKey") ?? "") });
    await setWorkspaceCookie(workspaceId);
  } catch (error) { redirect(`/dashboard?error=${sellerErrorCode(error)}`); }
  redirect("/dashboard");
}

export async function selectWorkspace(formData: FormData) {
  const workspaceId = String(formData.get("workspaceId") ?? "");
  let destination = "/dashboard";
  try {
    requireDemoMode();
    const session = await requireCurrentSession();
    if (session.user.role !== "CITIZEN") throw new Error("This demo workspace is unavailable.");
    // Authorize the selected workspace before reading any of its journeys.
    await requireWorkspaceMember(workspaceId, session.userId);
    const applications = await prisma.application.findMany({
      where: { workspaceId, participants: { some: { userId: session.userId } } },
      orderBy: { updatedAt: "desc" },
      take: 1,
      select: { id: true, state: true, participants: { where: { userId: session.userId }, select: { role: true }, take: 1 } },
    });
    await setWorkspaceCookie(workspaceId);
    const application = applications[0];
    const participantRole = application?.participants[0]?.role;
    if (application && participantRole !== "SELLER" && participantRole !== "BUYER") throw new Error("This journey is unavailable.");
    destination = selectedWorkspaceDestination(session.userId, application ? { id: application.id, state: application.state, participantRole } : null);
  } catch (error) {
    redirect(`/dashboard?error=${sellerErrorCode(error)}`);
  }
  redirect(destination);
}

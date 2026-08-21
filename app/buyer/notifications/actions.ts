"use server";

import { redirect } from "next/navigation";
import { requireCurrentSession } from "@/src/identity/access";
import { requireDemoMode } from "@/src/identity/config";
import { setWorkspaceCookie } from "@/src/identity/cookies";
import { sellerErrorCode } from "@/src/domain/seller-errors";
import { prisma } from "@/src/lib/prisma";
import { notificationApplicationDestination } from "@/src/workspace/notification-navigation";
import { requireWorkspaceMember } from "@/src/workspace/context";

export async function openNotificationApplication(formData: FormData) {
  const applicationId = String(formData.get("applicationId") ?? "");
  let destination = "/buyer/notifications";
  try {
    requireDemoMode();
    const session = await requireCurrentSession();
    if (session.userId !== "synthetic-rahul-shetty" || session.user.role !== "CITIZEN") throw new Error("This notification is unavailable.");
    // The submitted ID is only a lookup key. Scope it to the active buyer before deriving workspace or route.
    const application = await prisma.application.findFirst({
      where: { id: applicationId, participants: { some: { userId: session.userId, role: "BUYER" } } },
      select: { id: true, state: true, workspaceId: true, participants: { where: { userId: session.userId, role: "BUYER" }, select: { role: true }, take: 1 } },
    });
    const participantRole = application?.participants[0]?.role;
    if (!application || participantRole !== "BUYER") throw new Error("This notification is unavailable.");
    await requireWorkspaceMember(application.workspaceId, session.userId);
    const target = notificationApplicationDestination(session.userId, { id: application.id, state: application.state, workspaceId: application.workspaceId, participantRole });
    await setWorkspaceCookie(target.workspaceId);
    destination = target.destination;
  } catch (error) {
    redirect(`/buyer/notifications?error=${sellerErrorCode(error)}`);
  }
  redirect(destination);
}

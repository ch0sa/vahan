import { selectedWorkspaceDestination } from "./navigation";

export type NotificationScopedApplication = { id: string; state: string; workspaceId: string; participantRole: "SELLER" | "BUYER" };

/** Converts an already participant-scoped application into a safe resume target. */
export function notificationApplicationDestination(userId: string, application: NotificationScopedApplication) {
  if (application.participantRole !== "BUYER") throw new Error("This notification is unavailable.");
  return { workspaceId: application.workspaceId, destination: selectedWorkspaceDestination(userId, application) };
}

import type { ParticipantRole, UserRole } from "@prisma/client";

export type ApplicationAccess = { userId: string; role: UserRole; participantRole?: ParticipantRole | null };
export function requireApplicationRole(access: ApplicationAccess | null, required: ParticipantRole) {
  return Boolean(access && access.role === "CITIZEN" && access.participantRole === required);
}
export function canAccessDemoControls(access: ApplicationAccess | null) { return access?.role === "DEMO_OPERATOR"; }

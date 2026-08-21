"use server";
import { redirect } from "next/navigation";
import { requireCurrentSession } from "@/src/identity/access";
import { requireDemoMode } from "@/src/identity/config";
import { sellerErrorCode } from "@/src/domain/seller-errors";
import { SubmissionService } from "@/src/domain/submission";
import { prisma } from "@/src/lib/prisma";
import { requireCurrentWorkspaceApplication } from "@/src/workspace/context";
const service = new SubmissionService(prisma);
export async function submitApplication(formData: FormData) { const applicationId = String(formData.get("applicationId") ?? ""); try { requireDemoMode(); const session = await requireCurrentSession(); await requireCurrentWorkspaceApplication(applicationId, session.userId); await service.submitApplication(session.userId, { applicationId, idempotencyKey: String(formData.get("intentKey") ?? ""), expectedVersion: Number(formData.get("expectedVersion")) }); } catch (error) { redirect(`/buyer/payment?application=${applicationId}&error=${sellerErrorCode(error)}`); } redirect(`/case?application=${applicationId}`); }

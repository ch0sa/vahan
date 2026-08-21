"use server";
import { redirect } from "next/navigation";
import { requireCurrentSession } from "@/src/identity/access";
import { requireDemoMode } from "@/src/identity/config";
import { CitizenFollowupService } from "@/src/domain/citizen-followups";
import { sellerErrorCode } from "@/src/domain/seller-errors";
import { prisma } from "@/src/lib/prisma";
import { requireCurrentWorkspaceApplication } from "@/src/workspace/context";
import { DemoCompletionService } from "@/src/domain/demo-completion";
const service = new CitizenFollowupService(prisma);
export async function submitCorrection(formData: FormData) { const applicationId = String(formData.get("applicationId") ?? ""); try { requireDemoMode(); const session = await requireCurrentSession(); await requireCurrentWorkspaceApplication(applicationId, session.userId); await service.submitCorrection(session.userId, { applicationId, requestId: String(formData.get("requestId") ?? ""), idempotencyKey: String(formData.get("intentKey") ?? ""), expectedVersion: Number(formData.get("expectedVersion")), reasonCode: "SYNTHETIC_CORRECTION_REQUIRED", response: "SYNTHETIC_CORRECTION_CONFIRMED" }); } catch (error) { redirect(`/case?application=${applicationId}&error=${sellerErrorCode(error)}`); } redirect(`/case?application=${applicationId}`); }
export async function requestWithdrawal(formData: FormData) { const applicationId = String(formData.get("applicationId") ?? ""); try { requireDemoMode(); const session = await requireCurrentSession(); await requireCurrentWorkspaceApplication(applicationId, session.userId); await service.requestWithdrawal(session.userId, { applicationId, idempotencyKey: String(formData.get("intentKey") ?? ""), expectedVersion: Number(formData.get("expectedVersion")) }); } catch (error) { redirect(`/case?application=${applicationId}&error=${sellerErrorCode(error)}`); } redirect(`/case?application=${applicationId}`); }
export async function completeDemoJourney(formData: FormData) { const applicationId = String(formData.get("applicationId") ?? ""); try { requireDemoMode(); const session = await requireCurrentSession(); await requireCurrentWorkspaceApplication(applicationId, session.userId); await new DemoCompletionService(prisma).complete(session.userId, applicationId); } catch (error) { redirect(`/case?application=${applicationId}&error=${sellerErrorCode(error)}`); } redirect(`/case?application=${applicationId}`); }

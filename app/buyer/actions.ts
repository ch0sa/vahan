"use server";
import { redirect } from "next/navigation";
import { requireCurrentSession } from "@/src/identity/access";
import { requireDemoMode } from "@/src/identity/config";
import { BuyerFlowService } from "@/src/domain/buyer-flow";
import { sellerErrorCode } from "@/src/domain/seller-errors";
import { prisma } from "@/src/lib/prisma";
import { requireCurrentWorkspaceApplication } from "@/src/workspace/context";
const service = new BuyerFlowService(prisma);
export async function acceptBuyer(formData: FormData) { const applicationId = String(formData.get("applicationId") ?? ""); try { requireDemoMode(); const session = await requireCurrentSession(); await requireCurrentWorkspaceApplication(applicationId, session.userId); await service.acceptBuyer(session.userId, { applicationId, idempotencyKey: String(formData.get("intentKey") ?? ""), expectedVersion: Number(formData.get("expectedVersion")) }); } catch (error) { redirect(`/buyer?application=${applicationId}&error=${sellerErrorCode(error)}`); } redirect(`/buyer?application=${applicationId}`); }

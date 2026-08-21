"use server";
import { redirect } from "next/navigation";
import { requireDemoOperator } from "@/src/identity/access";
import { requireDemoMode } from "@/src/identity/config";
import { SubmissionService } from "@/src/domain/submission";
import { ExternalCaseService } from "@/src/domain/external-case-service";
import { allowedSimulatorEvents, stableSimulatorEventId, type SimulatorKind } from "@/src/domain/simulator-policy";
import { prisma } from "@/src/lib/prisma";
import { PaymentFlowService } from "@/src/domain/payment-flow";
import { allowedPaymentSimulatorKinds, stablePaymentSimulatorEventId, type PaymentSimulatorKind } from "@/src/domain/payment-simulator-policy";
import { CitizenFollowupService } from "@/src/domain/citizen-followups";
import { followupDeliveryMatches } from "@/src/domain/followup-policy";
const operatorError = (error: unknown) => { const message = error instanceof Error ? error.message : ""; if (/NEXT_REDIRECT/.test(message)) throw error; if (/demo mode|operator|session|forbidden/i.test(message)) return "forbidden"; if (/stale|changed|version/i.test(message)) return "stale"; if (/dispatch|provider|outbox/i.test(message)) return "dispatch-failed"; return "generic"; };
export async function dispatchGovernmentSubmit(formData: FormData) { try { requireDemoMode(); const operator = await requireDemoOperator(); const outboxId = String(formData.get("outboxId") ?? ""); const outbox = await prisma.outboxMessage.findFirst({ where: { id: outboxId, kind: "GOVERNMENT_CASE_SUBMIT", status: { in: ["PENDING", "PROCESSING"] } } }); if (!outbox) redirect("/demo/backoffice?error=unavailable"); const recent = await prisma.operatorAction.findFirst({ where: { operatorId: operator.userId, action: "DISPATCH_GOVERNMENT_CASE", targetId: outboxId, createdAt: { gt: new Date(Date.now() - 5_000) } } }); if (recent) redirect("/demo/backoffice?error=cooldown"); await prisma.operatorAction.create({ data: { operatorId: operator.userId, action: "DISPATCH_GOVERNMENT_CASE", targetId: outboxId } }); await prisma.auditEvent.create({ data: { applicationId: outbox!.applicationId, actorId: operator.userId, action: "OPERATOR_DISPATCH_GOVERNMENT_CASE" } }); await new SubmissionService(prisma).dispatchGovernmentSubmit(outboxId); } catch (error) { redirect(`/demo/backoffice?error=${operatorError(error)}`); } redirect("/demo/backoffice"); }
export async function emitSyntheticRtoEvent(formData: FormData) {
  try {
    requireDemoMode();
    const operator = await requireDemoOperator();
    const applicationId = String(formData.get("applicationId") ?? "");
    const kind = String(formData.get("kind") ?? "") as SimulatorKind;
    const intentKey = String(formData.get("intentKey") ?? "");
    const app = await prisma.application.findFirst({
      where: { id: applicationId },
      include: {
        externalCase: true,
        correctionRequests: { where: { status: "OPEN" }, include: { submissions: { orderBy: { version: "desc" }, take: 1 } } },
        withdrawalRequests: { where: { status: "OPEN" }, orderBy: { createdAt: "desc" }, take: 1 },
        outboxMessages: { where: { status: "SUCCEEDED", kind: { in: ["CORRECTION_SUBMIT", "WITHDRAWAL_REQUEST"] } } },
      },
    });
    const correctionSubmissionId = app?.correctionRequests[0]?.submissions[0]?.id;
    const withdrawalRequestId = app?.withdrawalRequests[0]?.id;
    const correctionDelivered = Boolean(correctionSubmissionId && app?.outboxMessages.some((outbox) => followupDeliveryMatches({
      kind: outbox.kind,
      status: outbox.status,
      applicationId: outbox.applicationId ?? "",
      expectedApplicationId: applicationId,
      payload: outbox.payload,
      key: "correctionSubmissionId",
      expectedId: correctionSubmissionId,
    })));
    const withdrawalDelivered = Boolean(withdrawalRequestId && app?.outboxMessages.some((outbox) => followupDeliveryMatches({
      kind: outbox.kind,
      status: outbox.status,
      applicationId: outbox.applicationId ?? "",
      expectedApplicationId: applicationId,
      payload: outbox.payload,
      key: "withdrawalRequestId",
      expectedId: withdrawalRequestId,
    })));
    if (!app?.externalCase || !allowedSimulatorEvents(app.state, correctionDelivered, withdrawalDelivered).includes(kind) || intentKey.length < 16) redirect("/demo/backoffice?error=invalid-event");
    const recent = await prisma.operatorAction.findFirst({ where: { operatorId: operator.userId, action: `EMIT_${kind}`, targetId: applicationId, createdAt: { gt: new Date(Date.now() - 5_000) } } });
    if (recent) redirect("/demo/backoffice?error=cooldown");
    const cursor = await prisma.externalEventCursor.findUnique({ where: { source_externalReference: { source: "MOCK_RTO", externalReference: app.externalCase.externalReference } } });
    await prisma.operatorAction.create({ data: { operatorId: operator.userId, action: `EMIT_${kind}`, targetId: applicationId } });
    await new ExternalCaseService(prisma).ingestRtoEvent({
      source: "MOCK_RTO",
      externalEventId: stableSimulatorEventId(applicationId, kind, intentKey),
      externalReference: app.externalCase.externalReference,
      payloadVersion: "rto-event-v1",
      kind,
      sequence: (cursor?.lastAppliedSequence ?? 0) + 1,
      payload: kind === "CORRECTION_REQUESTED"
        ? { reasonCode: "SYNTHETIC_CORRECTION_REQUIRED", explanation: "Synthetic correction requested.", targetRole: "SELLER" }
        : kind === "REJECTED"
          ? { reasonCode: "SYNTHETIC_REVIEW_REJECTED", explanation: "Synthetic review rejected for the demo scenario." }
          : kind === "REGISTRY_UPDATE_COMPLETED"
            ? { effectiveAt: "2026-08-20T00:00:00.000Z" }
            : {},
    });
  } catch (error) {
    redirect(`/demo/backoffice?error=${operatorError(error)}`);
  }
  redirect("/demo/backoffice");
}
export async function emitSyntheticPaymentEvent(formData: FormData) { try { requireDemoMode(); const operator = await requireDemoOperator(); const attemptId = String(formData.get("attemptId") ?? ""); const kind = String(formData.get("eventKind") ?? "") as PaymentSimulatorKind; const intentKey = String(formData.get("intentKey") ?? ""); const attempt = await prisma.paymentAttempt.findUnique({ where: { id: attemptId }, include: { payment: { include: { application: true, reconciliations: { where: { status: "OPEN" } } } }, providerEvents: { where: { disposition: "APPLIED" }, orderBy: { sequence: "desc" }, take: 1 } } }); if (!attempt?.providerReference || intentKey.length < 16 || !allowedPaymentSimulatorKinds(attempt.status, attempt.payment.reconciliations.length > 0).includes(kind)) redirect("/demo/backoffice?error=invalid-event"); const recent = await prisma.operatorAction.findFirst({ where: { operatorId: operator.userId, action: `EMIT_PAYMENT_${kind}`, targetId: attemptId, createdAt: { gt: new Date(Date.now() - 5_000) } } }); if (recent) redirect("/demo/backoffice?error=cooldown"); const sequence = (attempt.providerEvents[0]?.sequence ?? 0) + 1; await prisma.operatorAction.create({ data: { operatorId: operator.userId, action: `EMIT_PAYMENT_${kind}`, targetId: attemptId } }); await prisma.auditEvent.create({ data: { applicationId: attempt.payment.applicationId, actorId: operator.userId, action: "OPERATOR_EMIT_PAYMENT_EVENT" } }); await new PaymentFlowService(prisma).ingestProviderEvent({ source: "MOCK_PAYMENT_PROVIDER", externalEventId: stablePaymentSimulatorEventId(attempt.payment.applicationId, attempt.id, kind, intentKey), providerReference: attempt.providerReference, kind, payloadVersion: "payment-event-v1", sequence, payload: {} }); } catch (error) { redirect(`/demo/backoffice?error=${operatorError(error)}`); } redirect("/demo/backoffice"); }
export async function dispatchFollowupOutbox(formData: FormData) {
  try {
    requireDemoMode();
    const operator = await requireDemoOperator();
    const outboxId = String(formData.get("outboxId") ?? "");
    const outbox = await prisma.outboxMessage.findFirst({
      where: { id: outboxId, kind: { in: ["CORRECTION_SUBMIT", "WITHDRAWAL_REQUEST"] } },
    });
    if (!outbox) redirect("/demo/backoffice?error=unavailable");
    const recent = await prisma.operatorAction.findFirst({
      where: {
        operatorId: operator.userId,
        action: "DISPATCH_FOLLOWUP",
        targetId: outboxId,
        createdAt: { gt: new Date(Date.now() - 5_000) },
      },
    });
    if (recent) redirect("/demo/backoffice?error=cooldown");
    await prisma.operatorAction.create({
      data: { operatorId: operator.userId, action: "DISPATCH_FOLLOWUP", targetId: outboxId },
    });
    await prisma.auditEvent.create({
      data: { applicationId: outbox.applicationId, actorId: operator.userId, action: "OPERATOR_DISPATCH_FOLLOWUP" },
    });
    await new CitizenFollowupService(prisma).dispatchFollowupOutbox(outboxId);
    const delivered = await prisma.outboxMessage.findUnique({
      where: { id: outboxId },
      select: { applicationId: true, status: true },
    });
    if (delivered?.applicationId && delivered.status === "SUCCEEDED") {
      await new ExternalCaseService(prisma).retryContiguousPendingForApplication(delivered.applicationId);
    }
  } catch (error) {
    redirect(`/demo/backoffice?error=${operatorError(error)}`);
  }
  redirect("/demo/backoffice");
}

import { Prisma, type ApplicationState, type PrismaClient } from "@prisma/client";
import { ExternalCaseService } from "./external-case-service";
import { SubmissionService } from "./submission";

export type DemoJourneyStep = "RESUME" | "DISPATCH" | "INWARD" | "APPROVE" | "COMPLETE" | "DONE";

export function demoJourneyStep(state: string): DemoJourneyStep | null {
  const steps: Partial<Record<ApplicationState, DemoJourneyStep>> = {
    SUBMITTED: "DISPATCH",
    SENT_TO_RTO: "INWARD",
    RTO_PROCESSING: "APPROVE",
    APPROVED: "COMPLETE",
    REGISTRY_UPDATE_COMPLETE: "DONE",
    WITHDRAWAL_PENDING: "RESUME",
  };
  return steps[state as ApplicationState] ?? null;
}

/** Completes only the happy path of the local demo. It never contacts an external system. */
export class DemoCompletionService {
  constructor(private readonly db: PrismaClient) {}

  async complete(actorId: string, applicationId: string) {
    for (let count = 0; count < 6; count += 1) {
      const app = await this.db.application.findFirst({
        where: { id: applicationId, participants: { some: { userId: actorId } } },
        include: { externalCase: true },
      });
      if (!app) throw new Error("Application unavailable.");
      const step = demoJourneyStep(app.state);
      if (!step) throw new Error("This application cannot be completed from its current step.");
      if (step === "DONE") return app;

      if (step === "RESUME") {
        await this.db.$transaction(async (tx) => {
          const current = await tx.application.findUnique({
            where: { id: applicationId },
            include: { participants: true, externalCase: true },
          });
          if (!current || current.externalCase || !current.participants.some((participant) => participant.userId === actorId) || current.state !== "WITHDRAWAL_PENDING") {
            throw new Error("This withdrawal cannot be resumed automatically.");
          }
          const updated = await tx.application.updateMany({
            where: { id: current.id, state: "WITHDRAWAL_PENDING", aggregateVersion: current.aggregateVersion },
            data: { state: "SUBMITTED", aggregateVersion: { increment: 1 } },
          });
          if (updated.count !== 1) throw new Error("Application changed. Refresh and try again.");
          await tx.withdrawalRequest.updateMany({ where: { applicationId, status: "OPEN" }, data: { status: "CANCELLED", resolvedAt: new Date() } });
          await tx.outboxMessage.updateMany({
            where: { applicationId, kind: "WITHDRAWAL_REQUEST", status: { in: ["PENDING", "PROCESSING"] } },
            data: { status: "FAILED", completedAt: new Date(), leaseUntil: null, safeLastErrorCode: "CANCELLED_BEFORE_SEND" },
          });
          await tx.workflowEvent.create({ data: { applicationId, version: current.aggregateVersion + 1, eventType: "WITHDRAWAL_CANCELLED" } });
          await tx.auditEvent.create({ data: { applicationId, actorId, action: "CANCEL_DEMO_WITHDRAWAL" } });
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
        continue;
      }

      if (step === "DISPATCH") {
        const outbox = await this.db.outboxMessage.findFirst({
          where: { applicationId, kind: "GOVERNMENT_CASE_SUBMIT", status: { in: ["PENDING", "PROCESSING"] } },
          orderBy: { nextAttemptAt: "asc" },
        });
        if (!outbox) throw new Error("Application submission is not ready.");
        await new SubmissionService(this.db).dispatchGovernmentSubmit(outbox.id);
        continue;
      }

      if (!app.externalCase) throw new Error("Application reference unavailable.");
      const cursor = await this.db.externalEventCursor.findUnique({
        where: { source_externalReference: { source: "MOCK_RTO", externalReference: app.externalCase.externalReference } },
      });
      const kind = step === "INWARD" ? "INWARDED" : step === "APPROVE" ? "APPROVED" : "REGISTRY_UPDATE_COMPLETED";
      const sequence = (cursor?.lastAppliedSequence ?? 0) + 1;
      const payload = kind === "REGISTRY_UPDATE_COMPLETED"
        ? { effectiveAt: new Date(Math.max(app.createdAt.getTime() + 60_000, Date.now())).toISOString() }
        : {};
      await new ExternalCaseService(this.db).ingestRtoEvent({
        source: "MOCK_RTO",
        externalEventId: `demo-journey:${applicationId}:${kind}`,
        externalReference: app.externalCase.externalReference,
        payloadVersion: "rto-event-v1",
        kind,
        sequence,
        payload,
      });
    }
    throw new Error("Application did not reach completion.");
  }
}

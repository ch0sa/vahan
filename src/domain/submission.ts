import { Prisma, type PrismaClient, UserRole } from "@prisma/client";
import { z } from "zod";
import { canonicalHash } from "./canonical";
import { validateSubmissionEvidence } from "./payment-flow";
import { MockRtoCaseProvider, type MockRtoMode } from "@/src/adapters/mock";
import { externalReferenceOwnershipDisposition, externalReferenceSchema } from "./external-reference-policy";

const inputSchema = z.object({ applicationId: z.string().min(1), idempotencyKey: z.string().min(16), expectedVersion: z.number().int() });
export class SubmissionService {
  constructor(private readonly db: PrismaClient, private readonly rto = new MockRtoCaseProvider()) {}
  async submitApplication(actorId: string, raw: unknown) {
    const input = inputSchema.parse(raw); const requestHash = canonicalHash(input);
    return this.db.$transaction(async (tx) => {
      const prior = await tx.commandReceipt.findUnique({ where: { scope_actorId_command_idempotencyKey: { scope: `application:${input.applicationId}`, actorId, command: "SubmitApplication", idempotencyKey: input.idempotencyKey } } });
      if (prior) { if (prior.requestHash !== requestHash) throw new Error("Intent input changed."); return prior.result; }
      const app = await tx.application.findUnique({ where: { id: input.applicationId }, include: { participants: true, buyerInformation: true, buyerDeclaration: true, sellerDeclaration: true, readinessResults: { orderBy: { createdAt: "desc" }, take: 2 }, payments: { include: { attempts: true, reconciliations: { where: { status: "OPEN" } } } } } }); const user = await tx.user.findUnique({ where: { id: actorId }, select: { role: true } }); const payment = app?.payments[0];
      if (!app || !user || user.role !== UserRole.CITIZEN || actorId !== "synthetic-rahul-shetty" || !app.participants.some((p) => p.userId === actorId && p.role === "BUYER") || app.state !== "PAYMENT_CONFIRMED" || app.aggregateVersion !== input.expectedVersion || !payment || payment.status !== "CONFIRMED" || payment.attempts.filter((a) => a.status === "CONFIRMED").length !== 1 || payment.reconciliations.length !== 0 || !validateSubmissionEvidence({ application: app, buyerInformation: app.buyerInformation ?? undefined, buyerDeclaration: app.buyerDeclaration ?? undefined, sellerDeclaration: app.sellerDeclaration ?? undefined, readinessResults: app.readinessResults })) throw new Error("Refresh the synthetic submission status.");
      const update = await tx.application.updateMany({ where: { id: app.id, state: "PAYMENT_CONFIRMED", aggregateVersion: input.expectedVersion }, data: { state: "SUBMITTED", aggregateVersion: { increment: 1 } } }); if (update.count !== 1) throw new Error("This transfer changed. Refresh and review it.");
      const result = { applicationId: app.id, state: "SUBMITTED", aggregateVersion: app.aggregateVersion + 1 };
      await tx.outboxMessage.create({ data: { applicationId: app.id, kind: "GOVERNMENT_CASE_SUBMIT", idempotencyKey: `government-case-submit:${app.id}`, payload: { applicationId: app.id } } }); await tx.workflowEvent.create({ data: { applicationId: app.id, version: app.aggregateVersion + 1, eventType: "APPLICATION_SUBMITTED" } }); await tx.auditEvent.create({ data: { applicationId: app.id, actorId, action: "SUBMIT_APPLICATION" } }); await tx.commandReceipt.create({ data: { scope: `application:${app.id}`, actorId, command: "SubmitApplication", idempotencyKey: input.idempotencyKey, requestHash, result, aggregateVersion: app.aggregateVersion + 1, applicationId: app.id } }); return result;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
  async dispatchGovernmentSubmit(outboxId: string, mode?: MockRtoMode) {
    const now = new Date(); const candidate = await this.db.outboxMessage.findFirst({ where: { id: outboxId, kind: "GOVERNMENT_CASE_SUBMIT", OR: [{ status: "PENDING", nextAttemptAt: { lte: now } }, { status: "PROCESSING", leaseUntil: { lt: now } }] } }); if (!candidate) return;
    const leaseUntil = new Date(now.getTime() + 60_000); const claimed = await this.db.outboxMessage.updateMany({ where: { id: candidate.id, OR: [{ status: "PENDING", nextAttemptAt: { lte: now } }, { status: "PROCESSING", leaseUntil: { lt: now } }] }, data: { status: "PROCESSING", attemptCount: { increment: 1 }, claimedAt: now, leaseUntil } }); if (claimed.count !== 1) return;
    try { const response = await (mode ? new MockRtoCaseProvider(mode) : this.rto).submit({ idempotencyKey: candidate.idempotencyKey }); if (!response.externalReference) { await this.db.outboxMessage.update({ where: { id: candidate.id }, data: { status: "QUARANTINED", completedAt: new Date(), safeLastErrorCode: "MALFORMED_RTO_ACK" } }); return; } await this.finalizeAcknowledgement(candidate.id, response.externalReference); } catch { await this.db.outboxMessage.update({ where: { id: candidate.id }, data: { status: "PENDING", nextAttemptAt: new Date(Date.now() + 60_000), leaseUntil: null, safeLastErrorCode: "RTO_UNAVAILABLE" } }); }
  }
  async finalizeAcknowledgement(outboxId: string, externalReference: string) {
    externalReferenceSchema.parse(externalReference);
    return this.db.$transaction(async (tx) => {
      const outbox = await tx.outboxMessage.findUnique({
        where: { id: outboxId },
        include: { application: { include: { participants: true, externalCase: true } } },
      });
      if (!outbox?.application) throw new Error("Synthetic submission outbox is unavailable.");

      const app = outbox.application;
      if (outbox.status === "SUCCEEDED") {
        return { applicationId: app.id, state: app.state, externalReference: app.externalCase?.externalReference };
      }
      if (outbox.status !== "PROCESSING" || !["SUBMITTED", "WITHDRAWAL_PENDING"].includes(app.state)) {
        throw new Error("Synthetic submission acknowledgement is no longer applicable.");
      }

      const referenceOwner = await tx.externalCaseReference.findUnique({
        where: {
          source_externalReference: {
            source: "MOCK_RTO_CASE_PROVIDER",
            externalReference,
          },
        },
      });
      const referenceDisposition = externalReferenceOwnershipDisposition({ currentReference: app.externalCase?.externalReference, incoming: externalReference, applicationId: app.id, ownerApplicationId: referenceOwner?.applicationId });
      if (referenceDisposition === "CONFLICT") {
        await tx.outboxMessage.update({
          where: { id: outbox.id },
          data: {
            status: "QUARANTINED",
            completedAt: new Date(),
            leaseUntil: null,
            safeLastErrorCode: "RTO_REFERENCE_CONFLICT",
          },
        });
        await tx.auditEvent.create({
          data: {
            applicationId: app.id,
            action: "QUARANTINE_GOVERNMENT_CASE_ACK",
            payload: {
              existingReferenceHash: canonicalHash(app.externalCase?.externalReference),
              incomingReferenceHash: canonicalHash(externalReference),
            },
          },
        });
        return { applicationId: app.id, state: app.state, conflict: true as const };
      }

      const externalCase = referenceDisposition === "REUSE"
        ? (app.externalCase ?? referenceOwner)!
        : await tx.externalCaseReference.create({
            data: { applicationId: app.id, source: "MOCK_RTO_CASE_PROVIDER", externalReference },
          });
      const nextState = app.state === "WITHDRAWAL_PENDING" ? "WITHDRAWAL_PENDING" : "SENT_TO_RTO";
      const updated = await tx.application.updateMany({
        where: { id: app.id, state: app.state, aggregateVersion: app.aggregateVersion },
        data: { state: nextState, aggregateVersion: { increment: 1 } },
      });
      if (updated.count !== 1) throw new Error("Synthetic submission changed before acknowledgement.");

      await tx.outboxMessage.update({
        where: { id: outbox.id },
        data: { status: "SUCCEEDED", completedAt: new Date(), leaseUntil: null },
      });
      if (app.state === "WITHDRAWAL_PENDING") {
        await tx.outboxMessage.updateMany({
          where: {
            applicationId: app.id,
            kind: "WITHDRAWAL_REQUEST",
            status: "PROCESSING",
            safeLastErrorCode: "WAITING_FOR_CASE_ACK",
          },
          data: { status: "PENDING", safeLastErrorCode: null, nextAttemptAt: new Date() },
        });
      }
      await tx.workflowEvent.create({
        data: { applicationId: app.id, version: app.aggregateVersion + 1, eventType: "GOVERNMENT_CASE_ACKNOWLEDGED" },
      });
      await tx.auditEvent.create({ data: { applicationId: app.id, action: "ACKNOWLEDGE_GOVERNMENT_CASE" } });
      for (const participant of app.participants) {
        await tx.notification.upsert({
          where: { dedupeKey: `government-case-ack:${app.id}:${participant.userId}` },
          update: {},
          create: {
            userId: participant.userId,
            applicationId: app.id,
            href: `/case?application=${app.id}`,
            dedupeKey: `government-case-ack:${app.id}:${participant.userId}`,
            message: "Synthetic government-case acknowledgement recorded; this is not an official receipt.",
          },
        });
      }
      return { applicationId: app.id, state: nextState, externalReference: externalCase.externalReference };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
}

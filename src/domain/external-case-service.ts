import { ApplicationState, Prisma, type PrismaClient } from "@prisma/client";
import { canonicalHash } from "./canonical";
import { externalSequenceDisposition, externalTransition, ownershipPlan, rtoEnvelopeSchema } from "./external-case";
import { followupDeliveryMatches } from "./followup-policy";

export class ExternalCaseService {
  constructor(private readonly db: PrismaClient) {}
  async ingestRtoEvent(raw: unknown) {
    const parsed = rtoEnvelopeSchema.safeParse(raw);
    if (!parsed.success) { const safe = { kind: "MALFORMED", valueType: Array.isArray(raw) ? "array" : typeof raw }; const hash = canonicalHash(safe); const event = await this.db.inboxEvent.upsert({ where: { source_externalEventId: { source: "MOCK_RTO", externalEventId: `malformed:${hash}` } }, update: {}, create: { source: "MOCK_RTO", externalEventId: `malformed:${hash}`, sequence: 0, payload: safe, payloadHash: hash, disposition: "QUARANTINED", safeReason: "MALFORMED" } }); return { eventId: event.id, disposition: event.disposition }; }
    const value = parsed.data; const hash = canonicalHash({ kind: value.kind, payloadVersion: value.payloadVersion, sequence: value.sequence, payload: value.payload }); const event = await this.db.$transaction(async (tx) => { const existing = await tx.inboxEvent.findUnique({ where: { source_externalEventId: { source: value.source, externalEventId: value.externalEventId } } }); if (existing) return existing; return tx.inboxEvent.create({ data: { source: value.source, externalEventId: value.externalEventId, externalReference: value.externalReference, sequence: value.sequence, payload: value.payload, payloadVersion: value.payloadVersion, kind: value.kind, payloadHash: hash, disposition: "PENDING" } }); }); if (event.disposition !== "PENDING") return { eventId: event.id, disposition: event.disposition }; return this.processRtoEvent(event.id);
  }
  async processRtoEvent(eventId: string, drain = true) {
    const result = await this.db.$transaction(async (tx) => { const event = await tx.inboxEvent.findUnique({ where: { id: eventId } }); if (!event) throw new Error("External event unavailable."); if (event.disposition !== "PENDING") return { eventId, disposition: event.disposition }; const reference = event.externalReference; if (!reference || !event.kind || !event.payloadHash) return this.quarantine(tx, event.id, "MALFORMED"); const external = await tx.externalCaseReference.findUnique({ where: { source_externalReference: { source: "MOCK_RTO_CASE_PROVIDER", externalReference: reference } }, include: { application: { include: { participants: true } } } }); if (!external) return this.quarantine(tx, event.id, "UNKNOWN_REFERENCE"); const cursor = await tx.externalEventCursor.upsert({ where: { source_externalReference: { source: event.source, externalReference: reference } }, update: {}, create: { source: event.source, externalReference: reference } }); const disposition = externalSequenceDisposition({ sequence: event.sequence, lastAppliedSequence: cursor.lastAppliedSequence, hash: event.payloadHash, lastAppliedHash: cursor.lastAppliedHash ?? undefined }); if (disposition !== "APPLIED") { if (disposition === "PENDING") return { eventId, disposition, reason: "SEQUENCE_GAP" }; await tx.inboxEvent.update({ where: { id: event.id }, data: { disposition, processedAt: new Date(), safeReason: disposition === "QUARANTINED" ? "SEQUENCE_CONFLICT" : null } }); return { eventId, disposition }; }
      const app = external.application; const next = externalTransition(app.state, event.kind as never); if (!next) return this.quarantine(tx, event.id, "IMPOSSIBLE_STATE"); const update = await tx.application.updateMany({ where: { id: app.id, state: app.state, aggregateVersion: app.aggregateVersion }, data: { state: next as ApplicationState, aggregateVersion: { increment: 1 } } }); if (update.count !== 1) throw new Error("External event lost aggregate version.");
      if (event.kind === "REJECTED") { const payload = event.payload as { reasonCode?: string; explanation?: string }; if (payload.reasonCode !== "SYNTHETIC_REVIEW_REJECTED" || !payload.explanation || payload.explanation.length > 240) throw new Error("Rejection event lacks a bounded synthetic reason."); }
      if (event.kind === "CORRECTION_REQUESTED") { const payload = event.payload as { reasonCode?: string; explanation?: string; targetRole?: "SELLER" | "BUYER" }; if (!payload.reasonCode || !payload.explanation || !payload.targetRole) throw new Error("Correction event lacks bounded request."); await tx.correctionRequest.create({ data: { applicationId: app.id, sourceEventId: event.id, sequence: event.sequence, reasonCode: payload.reasonCode, explanation: payload.explanation, targetRole: payload.targetRole } }); }
      if (event.kind === "CORRECTION_ACKNOWLEDGED") { const request = await tx.correctionRequest.findFirst({ where: { applicationId: app.id, status: "OPEN", submissions: { some: {} } }, include: { submissions: { orderBy: { version: "desc" }, take: 1 } } }); const delivered = await tx.outboxMessage.findMany({ where: { applicationId: app.id, kind: "CORRECTION_SUBMIT", status: "SUCCEEDED" } }); const submissionId = request?.submissions[0]?.id; if (!request || !submissionId || !delivered.some((outbox) => followupDeliveryMatches({ kind: outbox.kind, status: outbox.status, applicationId: outbox.applicationId ?? "", expectedApplicationId: app.id, payload: outbox.payload, key: "correctionSubmissionId", expectedId: submissionId }))) throw new Error("No delivered correction is available."); await tx.correctionRequest.update({ where: { id: request.id }, data: { status: "RESOLVED", resolvedAt: new Date() } }); }
      if (event.kind === "INWARDED" && app.state === "WITHDRAWAL_PENDING") { await tx.withdrawalRequest.updateMany({ where: { applicationId: app.id, status: "OPEN" }, data: { status: "MANUAL_RTO_REQUIRED", resolvedAt: new Date() } }); }
      if (event.kind === "WITHDRAWAL_CONFIRMED") { const open = await tx.withdrawalRequest.findFirst({ where: { applicationId: app.id, status: "OPEN" } }); const delivered = await tx.outboxMessage.findMany({ where: { applicationId: app.id, kind: "WITHDRAWAL_REQUEST", status: "SUCCEEDED" } }); if (!open || !delivered.some((outbox) => followupDeliveryMatches({ kind: outbox.kind, status: outbox.status, applicationId: outbox.applicationId ?? "", expectedApplicationId: app.id, payload: outbox.payload, key: "withdrawalRequestId", expectedId: open.id }))) throw new Error("No delivered withdrawal request is available."); const resolved = await tx.withdrawalRequest.updateMany({ where: { id: open.id, status: "OPEN" }, data: { status: "RESOLVED", resolvedAt: new Date() } }); if (resolved.count !== 1) throw new Error("No open withdrawal is available."); }
      if (event.kind === "REGISTRY_UPDATE_COMPLETED") { const payload = event.payload as { effectiveAt?: string }; const seller = app.participants.find((p) => p.role === "SELLER"); const buyer = app.participants.find((p) => p.role === "BUYER"); const vehicle = await tx.vehicleProjection.findUnique({ where: { id: app.vehicleProjectionId }, include: { ownerships: { where: { validUntil: null } } } }); const effectiveAt = payload.effectiveAt ? new Date(payload.effectiveAt) : new Date("invalid"); const currentOwnership = vehicle?.ownerships[0]; if (!seller || !buyer || !vehicle || !currentOwnership || currentOwnership.ownerId !== seller.userId || !ownershipPlan({ sellerId: seller.userId, buyerId: buyer.userId, currentOwners: vehicle.ownerships.length, currentValidFrom: currentOwnership.validFrom, effectiveAt })) throw new Error("Registry completion ownership plan is invalid."); const close = await tx.vehicleOwnership.updateMany({ where: { id: currentOwnership.id, validUntil: null }, data: { validUntil: effectiveAt, transferApplicationReference: app.id } }); if (close.count !== 1) throw new Error("Ownership changed before completion."); await tx.vehicleOwnership.create({ data: { vehicleProjectionId: vehicle.id, ownerId: buyer.userId, validFrom: effectiveAt, source: "MOCK_RTO", externalReference: `synthetic-owner:${app.id}`, observedAt: new Date(), transferApplicationReference: app.id } }); }
      await tx.inboxEvent.update({ where: { id: event.id }, data: { applicationId: app.id, disposition: "APPLIED", processedAt: new Date() } }); await tx.externalEventCursor.update({ where: { id: cursor.id }, data: { lastAppliedSequence: event.sequence, lastAppliedHash: event.payloadHash } }); await tx.workflowEvent.create({ data: { applicationId: app.id, version: app.aggregateVersion + 1, eventType: `RTO_${event.kind}` } }); await tx.auditEvent.create({ data: { applicationId: app.id, action: `PROCESS_RTO_${event.kind}` } }); for (const p of app.participants) await tx.notification.upsert({ where: { dedupeKey: `rto:${event.id}:${p.userId}` }, update: {}, create: { userId: p.userId, applicationId: app.id, href: `/case?application=${app.id}`, dedupeKey: `rto:${event.id}:${p.userId}`, message: `Synthetic external-case status: ${next}.` } }); return { eventId, disposition: "APPLIED" as const, state: next };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    if (drain && result.disposition === "APPLIED") {
      const applied = await this.db.inboxEvent.findUnique({
        where: { id: eventId },
        select: { source: true, externalReference: true },
      });
      if (applied?.externalReference) await this.drainContiguousPending(applied.source, applied.externalReference);
    }
    return result;
  }
  async retryContiguousPendingForApplication(applicationId: string) {
    const external = await this.db.externalCaseReference.findUnique({ where: { applicationId }, select: { externalReference: true } });
    if (!external) return;
    await this.drainContiguousPending("MOCK_RTO", external.externalReference);
  }
  private async drainContiguousPending(source: string, externalReference: string, limit = 25) {
    for (let processed = 0; processed < limit; processed += 1) {
      const cursor = await this.db.externalEventCursor.findUnique({
        where: { source_externalReference: { source, externalReference } },
      });
      if (!cursor) return;
      const next = await this.db.inboxEvent.findFirst({
        where: {
          source,
          externalReference,
          sequence: cursor.lastAppliedSequence + 1,
          disposition: "PENDING",
        },
        orderBy: { receivedAt: "asc" },
      });
      if (!next) return;
      const outcome = await this.processRtoEvent(next.id, false);
      if (outcome.disposition !== "APPLIED") return;
    }
  }
  private async quarantine(tx: Prisma.TransactionClient, eventId: string, reason: string) { await tx.inboxEvent.update({ where: { id: eventId }, data: { disposition: "QUARANTINED", processedAt: new Date(), safeReason: reason } }); return { eventId, disposition: "QUARANTINED" as const, reason }; }
}

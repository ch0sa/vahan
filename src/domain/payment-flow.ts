import { ApplicationState, Prisma, type PrismaClient, UserRole } from "@prisma/client";
import { z } from "zod";
import { canonicalHash } from "./canonical";
import { buyerInformationContentHash, buyerStatement, sellerReadinessIsCurrentAndReady, syntheticDocumentsComplete } from "./buyer-flow";

const buyerId = "synthetic-rahul-shetty";
const commandSchema = z.object({ applicationId: z.string().min(1), idempotencyKey: z.string().min(16), expectedVersion: z.number().int() });
export const providerEventSchema = z.object({ source: z.literal("MOCK_PAYMENT_PROVIDER"), externalEventId: z.string().min(1), providerReference: z.string().min(1), kind: z.enum(["PENDING", "FAILED", "CONFIRMED", "AMBIGUOUS", "RECONCILIATION_CONFIRMED", "RECONCILIATION_FAILED"]), payloadVersion: z.literal("payment-event-v1"), sequence: z.number().int().nonnegative(), payload: z.record(z.string(), z.string()).default({}) });
export const syntheticPricing = { amountMinor: 1000, currency: "INR", label: "Synthetic prototype amount — not an official fee", disclosureVersion: "payment-prototype-v1", ruleVersion: "demo-v1" };
const receipt = (input: unknown) => canonicalHash(input);

export function validateSubmissionEvidence(input: { application: { ruleBodyHash: string; serviceRuleId: string }; buyerInformation?: { id: string; version: string; data: unknown; documentChecklist: unknown; provenanceVersion: string; disclosureVersion: string; contentHash: string }; buyerDeclaration?: { buyerInformationId: string; statementVersion: string; statementSnapshot: string }; sellerDeclaration?: { readinessResultId: string }; readinessResults: Array<{ id: string; status: string; ruleBodyHash: string }> }) {
  const info = input.buyerInformation; const current = input.readinessResults[0];
  return Boolean(info && input.application.serviceRuleId && info.contentHash === buyerInformationContentHash(info) && syntheticDocumentsComplete(info.documentChecklist) && input.buyerDeclaration?.buyerInformationId === info.id && input.buyerDeclaration.statementVersion === "buyer-prototype-v1" && input.buyerDeclaration.statementSnapshot === buyerStatement && input.readinessResults.length === 1 && sellerReadinessIsCurrentAndReady({ currentReadinessId: current?.id, declaredReadinessId: input.sellerDeclaration?.readinessResultId, status: current?.status, ruleBodyHash: current?.ruleBodyHash, pinnedRuleBodyHash: input.application.ruleBodyHash }));
}

export type ProviderMode = "PENDING" | "DEFINITE_PRE_SEND_FAILURE" | "AMBIGUOUS_TIMEOUT" | "MALFORMED";
export class MockPaymentProvider {
  constructor(private readonly mode: ProviderMode = "PENDING") {}
  async create(input: { idempotencyKey: string; attemptId: string }) {
    if (this.mode === "DEFINITE_PRE_SEND_FAILURE") return { kind: "DEFINITE_PRE_SEND_FAILURE" as const };
    if (this.mode === "AMBIGUOUS_TIMEOUT") throw new Error("Synthetic provider outcome is ambiguous.");
    if (this.mode === "MALFORMED") return { kind: "MALFORMED" as const };
    return { kind: "PENDING" as const, providerReference: `mock-pay-${input.attemptId}` };
  }
}

export function paymentEventDisposition(input: { incomingSequence: number; knownSequence: number; sameSequenceHash?: string; incomingHash: string }) {
  if (input.incomingSequence < input.knownSequence) return "STALE" as const;
  if (input.incomingSequence === input.knownSequence) return input.sameSequenceHash === input.incomingHash ? "DUPLICATE" as const : "QUARANTINED" as const;
  return input.incomingSequence === input.knownSequence + 1 ? "APPLIED" as const : "PENDING" as const;
}
export type ProviderEventKind = z.infer<typeof providerEventSchema>["kind"];
export const providerEventTransitionMatrix: Record<"REQUESTED" | "PENDING" | "FAILED" | "CONFIRMED" | "RECONCILIATION_REQUIRED", readonly ProviderEventKind[]> = {
  REQUESTED: ["PENDING", "FAILED", "AMBIGUOUS"],
  PENDING: ["PENDING", "FAILED", "CONFIRMED", "AMBIGUOUS"],
  FAILED: [],
  CONFIRMED: [],
  RECONCILIATION_REQUIRED: ["RECONCILIATION_CONFIRMED", "RECONCILIATION_FAILED"]
};
export function isLegalProviderEvent(status: keyof typeof providerEventTransitionMatrix, kind: ProviderEventKind, hasOpenReconciliation: boolean) {
  return providerEventTransitionMatrix[status].includes(kind) && (!kind.startsWith("RECONCILIATION_") || hasOpenReconciliation);
}
export function outboxClaimDisposition(input: { status: "PENDING" | "PROCESSING" | "SUCCEEDED" | "FAILED" | "QUARANTINED"; nextAttemptAt: number; leaseUntil?: number; now: number }) {
  if (input.status === "PENDING" && input.nextAttemptAt <= input.now) return "CLAIM" as const;
  if (input.status === "PROCESSING" && (input.leaseUntil ?? 0) < input.now) return "RECOVER_LEASE" as const;
  return "SKIP" as const;
}

export class PaymentFlowService {
  constructor(private readonly db: PrismaClient, private readonly provider = new MockPaymentProvider()) {}
  async completeSyntheticDemoPayment(actorId: string, raw: unknown) {
    const input = commandSchema.parse(raw); const requestHash = receipt(input);
    return this.db.$transaction(async (tx) => {
      const prior = await tx.commandReceipt.findUnique({ where: { scope_actorId_command_idempotencyKey: { scope: `application:${input.applicationId}`, actorId, command: "CompleteSyntheticDemoPayment", idempotencyKey: input.idempotencyKey } } });
      if (prior) { if (prior.requestHash !== requestHash) throw new Error("Intent input changed."); return prior.result; }
      const app = await tx.application.findUnique({ where: { id: input.applicationId }, include: { participants: true, payments: { include: { attempts: { orderBy: { attemptNumber: "desc" } }, reconciliations: { where: { status: "OPEN" } } } } } }); const user=await tx.user.findUnique({where:{id:actorId},select:{role:true}});
      if(!app||!user||user.role!==UserRole.CITIZEN||actorId!==buyerId||!app.participants.some(p=>p.userId===actorId&&p.role==="BUYER")||app.aggregateVersion!==input.expectedVersion||!["BUYER_VERIFIED","PAYMENT_REQUIRED","PAYMENT_PENDING","PAYMENT_FAILED","PAYMENT_RECONCILIATION_REQUIRED","PAYMENT_CONFIRMED"].includes(app.state)) throw new Error("Refresh the synthetic payment status.");
      const existingPayment=app.payments[0];
      if(app.state==="PAYMENT_CONFIRMED" && existingPayment?.attempts.some((attempt)=>attempt.status==="CONFIRMED") && existingPayment.reconciliations.length===0){const result={applicationId:app.id,state:app.state,aggregateVersion:app.aggregateVersion};await tx.commandReceipt.create({data:{scope:`application:${app.id}`,actorId,command:"CompleteSyntheticDemoPayment",idempotencyKey:input.idempotencyKey,requestHash,result,aggregateVersion:app.aggregateVersion,applicationId:app.id}});return result;}
      const payment=app.payments[0];
      if(!payment){
        const pricing={applicationId:app.id,...syntheticPricing};
        const snapshot=await tx.pricingSnapshot.create({data:{...pricing,contentHash:canonicalHash(pricing)}});
        const createdPayment=await tx.payment.create({data:{applicationId:app.id,pricingSnapshotId:snapshot.id,amountMinor:snapshot.amountMinor,currency:snapshot.currency,status:"CONFIRMED"}});
        await tx.paymentAttempt.create({data:{paymentId:createdPayment.id,attemptNumber:1,idempotencyKey:`synthetic-demo-payment:${app.id}:1`,status:"CONFIRMED",safeCode:"SYNTHETIC_DEMO_CONFIRMED",resolvedAt:new Date()}});
      } else {
        const confirmed=payment.attempts.find((attempt)=>attempt.status==="CONFIRMED");
        const latest=payment.attempts[0];
        if(!confirmed){
          if(latest && latest.status!=="FAILED") await tx.paymentAttempt.update({where:{id:latest.id},data:{status:"CONFIRMED",safeCode:"SYNTHETIC_DEMO_CONFIRMED",resolvedAt:new Date()}});
          else await tx.paymentAttempt.create({data:{paymentId:payment.id,attemptNumber:(latest?.attemptNumber??0)+1,idempotencyKey:`synthetic-demo-payment:${app.id}:${(latest?.attemptNumber??0)+1}`,status:"CONFIRMED",safeCode:"SYNTHETIC_DEMO_CONFIRMED",resolvedAt:new Date()}});
        }
        await tx.payment.update({where:{id:payment.id},data:{status:"CONFIRMED"}});
        if(payment.reconciliations.length) await tx.paymentReconciliation.updateMany({where:{paymentId:payment.id,status:"OPEN"},data:{status:"RESOLVED_CONFIRMED",resultCode:"SYNTHETIC_DEMO_CONFIRMED",resolvedAt:new Date()}});
      }
      if(app.state==="PAYMENT_CONFIRMED"){const result={applicationId:app.id,state:"PAYMENT_CONFIRMED",aggregateVersion:app.aggregateVersion};await tx.auditEvent.create({data:{applicationId:app.id,actorId,action:"REPAIR_SYNTHETIC_DEMO_PAYMENT_ATTEMPT"}});await tx.commandReceipt.create({data:{scope:`application:${app.id}`,actorId,command:"CompleteSyntheticDemoPayment",idempotencyKey:input.idempotencyKey,requestHash,result,aggregateVersion:app.aggregateVersion,applicationId:app.id}});return result;}
      const updated=await tx.application.updateMany({where:{id:app.id,state:app.state,aggregateVersion:app.aggregateVersion},data:{state:"PAYMENT_CONFIRMED",aggregateVersion:{increment:1}}});if(updated.count!==1)throw new Error("This transfer changed.");const result={applicationId:app.id,state:"PAYMENT_CONFIRMED",aggregateVersion:app.aggregateVersion+1};await tx.workflowEvent.create({data:{applicationId:app.id,version:app.aggregateVersion+1,eventType:"SYNTHETIC_DEMO_PAYMENT_CONFIRMED"}});await tx.auditEvent.create({data:{applicationId:app.id,actorId,action:"COMPLETE_SYNTHETIC_DEMO_PAYMENT"}});await tx.commandReceipt.create({data:{scope:`application:${app.id}`,actorId,command:"CompleteSyntheticDemoPayment",idempotencyKey:input.idempotencyKey,requestHash,result,aggregateVersion:app.aggregateVersion+1,applicationId:app.id}});return result;
    },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
  }
  async createPayment(actorId: string, raw: unknown) {
    const input = commandSchema.parse(raw); const requestHash = receipt(input);
    return this.db.$transaction(async (tx) => {
      const prior = await tx.commandReceipt.findUnique({ where: { scope_actorId_command_idempotencyKey: { scope: `application:${input.applicationId}`, actorId, command: "CreateSyntheticPayment", idempotencyKey: input.idempotencyKey } } });
      if (prior) { if (prior.requestHash !== requestHash) throw new Error("Intent input changed."); return prior.result; }
      const app = await tx.application.findUnique({ where: { id: input.applicationId }, include: { participants: true, buyerDeclaration: true, buyerInformation: true, sellerDeclaration: true, readinessResults: { orderBy: { createdAt: "desc" }, take: 2 }, payments: true } });
      const user = await tx.user.findUnique({ where: { id: actorId }, select: { role: true } });
      if (!app || !user || user.role !== UserRole.CITIZEN || actorId !== buyerId || !app.participants.some((p) => p.userId === actorId && p.role === "BUYER") || app.aggregateVersion !== input.expectedVersion || !validateSubmissionEvidence({ application: app, buyerInformation: app.buyerInformation ?? undefined, buyerDeclaration: app.buyerDeclaration ?? undefined, sellerDeclaration: app.sellerDeclaration ?? undefined, readinessResults: app.readinessResults })) throw new Error("Refresh the synthetic buyer payment.");
      if (app.payments[0]) { const result = { applicationId: app.id, paymentId: app.payments[0].id, state: app.state, aggregateVersion: app.aggregateVersion }; await tx.commandReceipt.create({ data: { scope: `application:${app.id}`, actorId, command: "CreateSyntheticPayment", idempotencyKey: input.idempotencyKey, requestHash, result, aggregateVersion: app.aggregateVersion, applicationId: app.id } }); return result; }
      if (app.state !== "BUYER_VERIFIED") throw new Error("Refresh the synthetic buyer payment.");
      const pricing = { applicationId: app.id, ...syntheticPricing };
      const snapshot = await tx.pricingSnapshot.create({ data: { ...pricing, contentHash: canonicalHash(pricing) } });
      const payment = await tx.payment.create({ data: { applicationId: app.id, pricingSnapshotId: snapshot.id, amountMinor: snapshot.amountMinor, currency: snapshot.currency, status: "REQUESTED" } });
      const update = await tx.application.updateMany({ where: { id: app.id, state: "BUYER_VERIFIED", aggregateVersion: input.expectedVersion }, data: { state: "PAYMENT_REQUIRED", aggregateVersion: { increment: 1 } } });
      if (update.count !== 1) throw new Error("This transfer changed. Refresh and review it.");
      const result = { applicationId: app.id, paymentId: payment.id, state: "PAYMENT_REQUIRED", aggregateVersion: app.aggregateVersion + 1 };
      await tx.workflowEvent.create({ data: { applicationId: app.id, version: app.aggregateVersion + 1, eventType: "SYNTHETIC_PAYMENT_CREATED" } });
      await tx.auditEvent.create({ data: { applicationId: app.id, actorId, action: "CREATE_SYNTHETIC_PAYMENT" } });
      await tx.commandReceipt.create({ data: { scope: `application:${app.id}`, actorId, command: "CreateSyntheticPayment", idempotencyKey: input.idempotencyKey, requestHash, result, aggregateVersion: app.aggregateVersion + 1, applicationId: app.id } });
      return result;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
  async initiateAttempt(actorId: string, raw: unknown) {
    const input = commandSchema.parse(raw); const requestHash = receipt(input);
    const outcome = await this.db.$transaction(async (tx) => {
      const prior = await tx.commandReceipt.findUnique({ where: { scope_actorId_command_idempotencyKey: { scope: `application:${input.applicationId}`, actorId, command: "InitiateSyntheticPayment", idempotencyKey: input.idempotencyKey } } });
      if (prior) { if (prior.requestHash !== requestHash) throw new Error("Intent input changed."); return prior.result; }
      const app = await tx.application.findUnique({ where: { id: input.applicationId }, include: { participants: true, payments: { include: { attempts: { orderBy: { attemptNumber: "desc" }, take: 1 } } } } });
      const user = await tx.user.findUnique({ where: { id: actorId }, select: { role: true } }); const payment = app?.payments[0]; const previous = payment?.attempts[0];
      if (!app || !payment || !user || user.role !== UserRole.CITIZEN || actorId !== buyerId || !app.participants.some((p) => p.userId === actorId && p.role === "BUYER") || app.aggregateVersion !== input.expectedVersion || !["PAYMENT_REQUIRED", "PAYMENT_FAILED"].includes(app.state) || !["REQUESTED", "FAILED"].includes(payment.status) || (previous && previous.status !== "FAILED")) throw new Error("Refresh the synthetic payment status.");
      const attempt = await tx.paymentAttempt.create({ data: { paymentId: payment.id, attemptNumber: (previous?.attemptNumber ?? 0) + 1, idempotencyKey: input.idempotencyKey, status: "REQUESTED" } });
      await tx.payment.update({ where: { id: payment.id }, data: { status: "PENDING" } });
      const update = await tx.application.updateMany({ where: { id: app.id, state: { in: ["PAYMENT_REQUIRED", "PAYMENT_FAILED"] }, aggregateVersion: input.expectedVersion }, data: { state: "PAYMENT_PENDING", aggregateVersion: { increment: 1 } } }); if (update.count !== 1) throw new Error("This transfer changed. Refresh and review it.");
      await tx.outboxMessage.create({ data: { applicationId: app.id, kind: "PAYMENT_CREATE_REQUESTED", idempotencyKey: `payment-attempt:${attempt.id}`, payload: { attemptId: attempt.id, paymentId: payment.id } } });
      const result = { applicationId: app.id, paymentId: payment.id, attemptId: attempt.id, state: "PAYMENT_PENDING", aggregateVersion: app.aggregateVersion + 1 };
      await tx.workflowEvent.create({ data: { applicationId: app.id, version: app.aggregateVersion + 1, eventType: "PAYMENT_CREATE_REQUESTED" } }); await tx.auditEvent.create({ data: { applicationId: app.id, actorId, action: "INITIATE_SYNTHETIC_PAYMENT" } }); await tx.commandReceipt.create({ data: { scope: `application:${app.id}`, actorId, command: "InitiateSyntheticPayment", idempotencyKey: input.idempotencyKey, requestHash, result, aggregateVersion: app.aggregateVersion + 1, applicationId: app.id } }); return result;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return outcome;
  }
  async checkPersistedStatus(actorId: string, raw: unknown) {
    const input = commandSchema.parse(raw); const requestHash = receipt(input);
    return this.db.$transaction(async (tx) => { const prior = await tx.commandReceipt.findUnique({ where: { scope_actorId_command_idempotencyKey: { scope: `application:${input.applicationId}`, actorId, command: "CheckSyntheticPaymentStatus", idempotencyKey: input.idempotencyKey } } }); if (prior) { if (prior.requestHash !== requestHash) throw new Error("Intent input changed."); return prior.result; } const app = await tx.application.findUnique({ where: { id: input.applicationId }, include: { participants: true, payments: true } }); const user = await tx.user.findUnique({ where: { id: actorId }, select: { role: true } }); if (!app || !user || user.role !== UserRole.CITIZEN || actorId !== buyerId || !app.participants.some((p) => p.userId === actorId && p.role === "BUYER") || app.aggregateVersion !== input.expectedVersion || !app.payments[0]) throw new Error("Refresh the synthetic payment status."); const result = { applicationId: app.id, paymentId: app.payments[0].id, status: app.payments[0].status, aggregateVersion: app.aggregateVersion }; await tx.commandReceipt.create({ data: { scope: `application:${app.id}`, actorId, command: "CheckSyntheticPaymentStatus", idempotencyKey: input.idempotencyKey, requestHash, result, aggregateVersion: app.aggregateVersion, applicationId: app.id } }); return result; }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
  async dispatchAttempt(attemptId: string) {
    const attempt = await this.db.paymentAttempt.findUnique({ where: { id: attemptId } }); if (!attempt || attempt.status !== "REQUESTED") return;
    try { const response = await this.provider.create({ idempotencyKey: attempt.idempotencyKey, attemptId });
      if (response.kind === "DEFINITE_PRE_SEND_FAILURE") return this.markDefiniteFailure(attemptId);
      if (response.kind !== "PENDING") return this.markAmbiguous(attemptId, response.kind);
      await this.db.paymentAttempt.update({ where: { id: attemptId }, data: { status: "PENDING", providerReference: response.providerReference, dispatchedAt: new Date() } });
    } catch { await this.markAmbiguous(attemptId, "AMBIGUOUS_DISPATCH"); }
  }
  async dispatchOwnedPendingOutbox(actorId: string, applicationId: string) {
    const owned = await this.db.application.findFirst({ where: { id: applicationId, participants: { some: { userId: actorId, role: "BUYER" } } }, select: { id: true } }); if (!owned || actorId !== buyerId) throw new Error("Refresh the synthetic payment status.");
    const now = new Date(); const leaseUntil = new Date(now.getTime() + 60_000);
    const candidate = await this.db.outboxMessage.findFirst({ where: { applicationId, kind: "PAYMENT_CREATE_REQUESTED", OR: [{ status: "PENDING", nextAttemptAt: { lte: now } }, { status: "PROCESSING", leaseUntil: { lt: now } }] }, orderBy: { id: "asc" } });
    if (!candidate) return;
    const claim = await this.db.outboxMessage.updateMany({ where: { id: candidate.id, OR: [{ status: "PENDING" }, { status: "PROCESSING", leaseUntil: { lt: now } }] }, data: { status: "PROCESSING", attemptCount: { increment: 1 }, claimedAt: now, leaseUntil, safeLastErrorCode: null } }); if (claim.count !== 1) return;
    const payload = candidate.payload as { attemptId?: string }; if (!payload.attemptId) { await this.db.outboxMessage.update({ where: { id: candidate.id }, data: { status: "QUARANTINED", completedAt: new Date(), safeLastErrorCode: "MALFORMED_OUTBOX" } }); return; }
    try { await this.dispatchAttempt(payload.attemptId); await this.db.outboxMessage.update({ where: { id: candidate.id }, data: { status: "SUCCEEDED", completedAt: new Date(), leaseUntil: null } }); } catch { await this.db.outboxMessage.update({ where: { id: candidate.id }, data: { status: "FAILED", completedAt: new Date(), leaseUntil: null, safeLastErrorCode: "DISPATCH_FAILURE" } }); }
  }
  private async markAmbiguous(attemptId: string, reasonCode: string) {
    await this.db.$transaction(async (tx) => { const attempt = await tx.paymentAttempt.findUnique({ where: { id: attemptId }, include: { payment: { include: { application: true } } } }); if (!attempt || attempt.status !== "REQUESTED") return; await this.freezeForReconciliation(tx, attempt, reasonCode); }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
  private async markDefiniteFailure(attemptId: string) {
    await this.db.$transaction(async (tx) => { const attempt = await tx.paymentAttempt.findUnique({ where: { id: attemptId }, include: { payment: { include: { application: true } } } }); if (!attempt || attempt.status !== "REQUESTED") return; await tx.paymentAttempt.update({ where: { id: attempt.id }, data: { status: "FAILED", safeCode: "PRE_SEND_FAILURE", resolvedAt: new Date() } }); await tx.payment.update({ where: { id: attempt.paymentId }, data: { status: "FAILED" } }); await this.transitionPaymentApplication(tx, attempt, "PAYMENT_FAILED", "PAYMENT_PRE_SEND_FAILED"); });
  }
  async ingestProviderEvent(raw: unknown) {
    const parsed = providerEventSchema.safeParse(raw);
    if (!parsed.success) {
      const safeEnvelope = { kind: "MALFORMED", valueType: Array.isArray(raw) ? "array" : typeof raw };
      const safeHash = canonicalHash(safeEnvelope); const externalEventId = `malformed:${safeHash}`;
      const event = await this.db.paymentProviderEvent.upsert({ where: { source_externalEventId: { source: "MOCK_PAYMENT_PROVIDER", externalEventId } }, update: {}, create: { source: "MOCK_PAYMENT_PROVIDER", externalEventId, providerReference: `malformed:${safeHash}`, kind: "MALFORMED", payloadVersion: "payment-event-v1", sequence: 0, payload: safeEnvelope, payloadHash: safeHash, disposition: "QUARANTINED", processedAt: new Date() } });
      return { disposition: event.disposition, reason: "MALFORMED", eventId: event.id };
    }
    const input = parsed.data; const payloadHash = canonicalHash({ kind: input.kind, payloadVersion: input.payloadVersion, sequence: input.sequence, payload: input.payload });
    const inserted = await this.db.$transaction(async (tx) => {
      const existing = await tx.paymentProviderEvent.findUnique({ where: { source_externalEventId: { source: input.source, externalEventId: input.externalEventId } } });
      if (existing) return existing;
      return tx.paymentProviderEvent.create({ data: { source: input.source, externalEventId: input.externalEventId, providerReference: input.providerReference, kind: input.kind, payloadVersion: input.payloadVersion, sequence: input.sequence, payload: input.payload, payloadHash, disposition: "PENDING" } });
    });
    if (inserted.disposition !== "PENDING") return { disposition: inserted.disposition, eventId: inserted.id };
    return this.processProviderEvent(inserted.id);
  }
  async processProviderEvent(eventId: string, drain = true) {
    const result = await this.db.$transaction(async (tx) => {
      const event = await tx.paymentProviderEvent.findUnique({ where: { id: eventId } });
      if (!event) throw new Error("Persisted provider event is unavailable.");
      if (event.disposition !== "PENDING") return { disposition: event.disposition, eventId: event.id };
      const input = { source: event.source, externalEventId: event.externalEventId, providerReference: event.providerReference, kind: event.kind as ProviderEventKind, payloadVersion: event.payloadVersion, sequence: event.sequence, payload: event.payload as Record<string, string> }; const payloadHash = event.payloadHash;
      const attempt = await tx.paymentAttempt.findUnique({ where: { providerReference: input.providerReference }, include: { payment: { include: { application: true, attempts: { orderBy: { attemptNumber: "desc" }, take: 1 } } }, providerEvents: { orderBy: { sequence: "desc" }, take: 1 } } });
      if (!attempt) { await tx.paymentProviderEvent.update({ where: { id: event.id }, data: { disposition: "QUARANTINED", processedAt: new Date() } }); return { disposition: "QUARANTINED" as const, eventId: event.id }; }
      const applied = await tx.paymentProviderEvent.findFirst({ where: { paymentAttemptId: attempt.id, disposition: "APPLIED" }, orderBy: { sequence: "desc" } }); const sequenceDisposition = applied ? paymentEventDisposition({ incomingSequence: input.sequence, knownSequence: applied.sequence, sameSequenceHash: applied.payloadHash, incomingHash: payloadHash }) : input.sequence === 1 ? "APPLIED" : "PENDING";
      if (sequenceDisposition !== "APPLIED") { await tx.paymentProviderEvent.update({ where: { id: event.id }, data: { paymentAttemptId: attempt.id, disposition: sequenceDisposition, processedAt: sequenceDisposition === "PENDING" ? null : new Date() } }); if (sequenceDisposition === "QUARANTINED") await this.freezeForReconciliation(tx, attempt, "SEQUENCE_CONFLICT", event.id); return { disposition: sequenceDisposition, eventId: event.id }; }
      const openReconciliation = await tx.paymentReconciliation.findFirst({ where: { paymentId: attempt.paymentId, status: "OPEN" } });
      await tx.paymentProviderEvent.update({ where: { id: event.id }, data: { paymentAttemptId: attempt.id } });
      if (!isLegalProviderEvent(attempt.status, input.kind, Boolean(openReconciliation))) { await tx.paymentProviderEvent.update({ where: { id: event.id }, data: { disposition: "QUARANTINED", processedAt: new Date() } }); if (input.kind === "CONFIRMED" || input.kind === "FAILED" || input.kind === "AMBIGUOUS") await this.freezeForReconciliation(tx, attempt, "ILLEGAL_TERMINAL_OR_STATE_EVENT", event.id); return { disposition: "QUARANTINED" as const, eventId: event.id }; }
      const newerAttemptExists = attempt.payment.attempts[0]?.id !== attempt.id;
      if (newerAttemptExists) { await tx.paymentProviderEvent.update({ where: { id: event.id }, data: { disposition: "QUARANTINED", processedAt: new Date() } }); if (input.kind !== "PENDING") await this.freezeForReconciliation(tx, attempt, "LATE_OLD_ATTEMPT_EVIDENCE", event.id); return { disposition: "QUARANTINED" as const, eventId: event.id }; }
      if (input.kind === "PENDING") { await tx.paymentAttempt.update({ where: { id: attempt.id }, data: { status: "PENDING", sequence: input.sequence } }); await tx.paymentProviderEvent.update({ where: { id: event.id }, data: { disposition: "APPLIED", processedAt: new Date() } }); return { disposition: "APPLIED" as const, eventId: event.id }; }
      if (input.kind === "AMBIGUOUS") { await this.freezeForReconciliation(tx, attempt, "PROVIDER_AMBIGUOUS", event.id); await tx.paymentProviderEvent.update({ where: { id: event.id }, data: { disposition: "APPLIED", processedAt: new Date() } }); return { disposition: "APPLIED" as const, eventId: event.id }; }
      if (input.kind === "FAILED" || input.kind === "RECONCILIATION_FAILED") { await tx.paymentAttempt.update({ where: { id: attempt.id }, data: { status: "FAILED", sequence: input.sequence, resolvedAt: new Date() } }); await tx.payment.update({ where: { id: attempt.paymentId }, data: { status: "FAILED" } }); if (input.kind === "RECONCILIATION_FAILED" && openReconciliation) await tx.paymentReconciliation.update({ where: { id: openReconciliation.id }, data: { status: "RESOLVED_FAILED", resultCode: "PROVIDER_FAILED", resolvedAt: new Date() } }); await this.transitionPaymentApplication(tx, attempt, "PAYMENT_FAILED", "PAYMENT_FAILED"); await tx.paymentProviderEvent.update({ where: { id: event.id }, data: { disposition: "APPLIED", processedAt: new Date() } }); return { disposition: "APPLIED" as const, eventId: event.id }; }
      if (input.kind === "CONFIRMED" || input.kind === "RECONCILIATION_CONFIRMED") { const updated = await tx.paymentAttempt.updateMany({ where: { id: attempt.id, status: { in: ["REQUESTED", "PENDING", "RECONCILIATION_REQUIRED"] } }, data: { status: "CONFIRMED", sequence: input.sequence, resolvedAt: new Date() } }); if (updated.count !== 1) { await tx.paymentProviderEvent.update({ where: { id: event.id }, data: { disposition: "QUARANTINED", processedAt: new Date() } }); await this.freezeForReconciliation(tx, attempt, "CONFIRM_RACE_OR_INVALID_STATE", event.id); return { disposition: "QUARANTINED" as const, eventId: event.id }; } await tx.payment.update({ where: { id: attempt.paymentId }, data: { status: "CONFIRMED" } }); if (input.kind === "RECONCILIATION_CONFIRMED" && openReconciliation) await tx.paymentReconciliation.update({ where: { id: openReconciliation.id }, data: { status: "RESOLVED_CONFIRMED", resultCode: "PROVIDER_CONFIRMED", resolvedAt: new Date() } }); await this.transitionPaymentApplication(tx, attempt, "PAYMENT_CONFIRMED", "PAYMENT_CONFIRMED"); await tx.paymentProviderEvent.update({ where: { id: event.id }, data: { disposition: "APPLIED", processedAt: new Date() } }); return { disposition: "APPLIED" as const, eventId: event.id }; }
      return { disposition: "QUARANTINED" as const, eventId: event.id };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    if (drain && result.disposition === "APPLIED") {
      const applied = await this.db.paymentProviderEvent.findUnique({
        where: { id: eventId },
        select: { providerReference: true },
      });
      if (applied) await this.drainContiguousPending(applied.providerReference);
    }
    return result;
  }
  private async drainContiguousPending(providerReference: string, limit = 25) {
    for (let processed = 0; processed < limit; processed += 1) {
      const attempt = await this.db.paymentAttempt.findUnique({
        where: { providerReference },
        select: { id: true },
      });
      if (!attempt) return;
      const applied = await this.db.paymentProviderEvent.findFirst({
        where: { paymentAttemptId: attempt.id, disposition: "APPLIED" },
        orderBy: { sequence: "desc" },
        select: { sequence: true },
      });
      const next = await this.db.paymentProviderEvent.findFirst({
        where: {
          providerReference,
          paymentAttemptId: attempt.id,
          disposition: "PENDING",
          sequence: (applied?.sequence ?? 0) + 1,
        },
        orderBy: { receivedAt: "asc" },
        select: { id: true },
      });
      if (!next) return;
      const outcome = await this.processProviderEvent(next.id, false);
      if (outcome.disposition !== "APPLIED") return;
    }
  }
  private async freezeForReconciliation(tx: Prisma.TransactionClient, attempt: { id: string; paymentId: string; payment: { application: { id: string; aggregateVersion: number } } }, reasonCode: string, eventId?: string) {
    const current = await tx.paymentAttempt.findUnique({ where: { id: attempt.id }, include: { payment: { include: { application: true } } } }); if (!current) return;
    if (["REQUESTED", "PENDING", "RECONCILIATION_REQUIRED"].includes(current.status)) await tx.paymentAttempt.update({ where: { id: current.id }, data: { status: "RECONCILIATION_REQUIRED", safeCode: reasonCode } });
    const open = await tx.paymentReconciliation.findFirst({ where: { paymentId: current.paymentId, status: "OPEN" } }); if (!open) await tx.paymentReconciliation.create({ data: { paymentId: current.paymentId, status: "OPEN", reasonCode, evidence: { attemptId: current.id }, triggerAttemptId: current.id, triggerEventId: eventId } });
    if (["PAYMENT_PENDING", "PAYMENT_REQUIRED"].includes(current.payment.application.state)) { await tx.payment.update({ where: { id: current.paymentId }, data: { status: "RECONCILIATION_REQUIRED" } }); await this.transitionPaymentApplication(tx, current, "PAYMENT_RECONCILIATION_REQUIRED", "PAYMENT_RECONCILIATION_REQUIRED"); }
  }
  private async transitionPaymentApplication(tx: Prisma.TransactionClient, attempt: { id: string; payment: { application: { id: string; aggregateVersion: number } } }, state: "PAYMENT_FAILED" | "PAYMENT_CONFIRMED" | "PAYMENT_RECONCILIATION_REQUIRED", eventType: string) {
    const app = attempt.payment.application;
    const allowedCurrent: ApplicationState[] = state === "PAYMENT_FAILED" ? ["PAYMENT_PENDING"] : state === "PAYMENT_CONFIRMED" ? ["PAYMENT_PENDING", "PAYMENT_RECONCILIATION_REQUIRED"] : ["PAYMENT_PENDING", "PAYMENT_REQUIRED"];
    const update = await tx.application.updateMany({ where: { id: app.id, state: { in: allowedCurrent }, aggregateVersion: app.aggregateVersion }, data: { state, aggregateVersion: { increment: 1 } } });
    if (update.count !== 1) throw new Error("Payment application transition lost its expected state/version.");
    await tx.workflowEvent.create({ data: { applicationId: app.id, version: app.aggregateVersion + 1, eventType } }); await tx.auditEvent.create({ data: { applicationId: app.id, action: eventType } }); await tx.notification.upsert({ where: { dedupeKey: `${eventType}:${app.id}:${attempt.id}` }, update: {}, create: { userId: buyerId, applicationId: app.id, href: `/buyer/payment?application=${app.id}`, dedupeKey: `${eventType}:${app.id}:${attempt.id}`, message: `Synthetic payment status: ${eventType}.` } });
  }
}

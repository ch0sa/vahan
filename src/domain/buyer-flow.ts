import { Prisma, type PrismaClient, UserRole } from "@prisma/client";
import { z } from "zod";
import { canonicalHash } from "./canonical";

export const syntheticBuyerId = "synthetic-rahul-shetty";
const inviteSchema = z.object({ applicationId: z.string(), idempotencyKey: z.string().min(16), expectedVersion: z.number().int() });
const acceptSchema = z.object({ applicationId: z.string(), idempotencyKey: z.string().min(16), expectedVersion: z.number().int() });
const hash = (value: unknown) => canonicalHash(value);
export const buyerStatement = "I confirm this is a synthetic MoveKA prototype acceptance. It is not a government declaration, Form 30, or proof of ownership transfer.";
export const deterministicBuyerInformation = { displayName: "Rahul Shetty", scenario: "synthetic-buyer-v1" };
export const deterministicBuyerDocuments = [{ code: "SYNTHETIC_ADDRESS_PROOF", status: "ATTACHED_FOR_DEMO", provenance: "MoveKA deterministic seed", disclosure: "Synthetic metadata only. Do not upload real documents." }] as const;

export function buyerInformationContentHash(snapshot: { version: string; data: unknown; documentChecklist: unknown; provenanceVersion: string; disclosureVersion: string }) {
  return canonicalHash({ version: snapshot.version, data: snapshot.data, documentChecklist: snapshot.documentChecklist, provenanceVersion: snapshot.provenanceVersion, disclosureVersion: snapshot.disclosureVersion });
}

export function canInviteSyntheticBuyer(actorRole: UserRole, isRecordedSeller: boolean, actorId: string) {
  return actorRole === UserRole.CITIZEN && isRecordedSeller && actorId !== syntheticBuyerId;
}

export function syntheticDocumentsComplete(value: unknown) {
  return Array.isArray(value) && value.length > 0 && value.every((document) =>
    typeof document === "object" && document !== null &&
    (document as { status?: unknown }).status === "ATTACHED_FOR_DEMO" &&
    (document as { provenance?: unknown }).provenance === "MoveKA deterministic seed"
  );
}

export function sellerReadinessIsCurrentAndReady(input: { currentReadinessId?: string; declaredReadinessId?: string; status?: string; ruleBodyHash?: string; pinnedRuleBodyHash: string }) {
  return Boolean(input.currentReadinessId && input.currentReadinessId === input.declaredReadinessId && input.status === "READY_FOR_DEMO" && input.ruleBodyHash === input.pinnedRuleBodyHash);
}

export class BuyerFlowService {
  constructor(private readonly db: PrismaClient) {}
  async inviteBuyer(actorId: string, raw: unknown) {
    const input = inviteSchema.parse(raw); const requestHash = hash(input);
    return this.db.$transaction(async (tx) => {
      const prior = await tx.commandReceipt.findUnique({ where: { scope_actorId_command_idempotencyKey: { scope: `application:${input.applicationId}`, actorId, command: "InviteBuyer", idempotencyKey: input.idempotencyKey } } });
      if (prior) { if (prior.requestHash !== requestHash) throw new Error("This intent key was already used with different input."); return prior.result; }
      const [app, actor] = await Promise.all([
        tx.application.findUnique({ where: { id: input.applicationId }, include: { participants: true, sellerDeclaration: true } }),
        tx.user.findUnique({ where: { id: actorId }, select: { role: true } })
      ]);
      const isRecordedSeller = app?.participants.some((p) => p.userId === actorId && p.role === "SELLER") ?? false;
      if (!app || !actor || !canInviteSyntheticBuyer(actor.role, isRecordedSeller, actorId) || app.state !== "SELLER_VERIFIED" || app.aggregateVersion !== input.expectedVersion || !app.sellerDeclaration) throw new Error("Refresh the seller transfer before inviting the buyer.");
      const updated = await tx.application.updateMany({ where: { id: app.id, state: "SELLER_VERIFIED", aggregateVersion: input.expectedVersion }, data: { state: "BUYER_ACTION_REQUIRED", aggregateVersion: { increment: 1 } } });
      if (updated.count !== 1) throw new Error("This transfer changed. Refresh and try again.");
      await tx.applicationParticipant.create({ data: { applicationId: app.id, userId: syntheticBuyerId, role: "BUYER" } });
      const information = { version: "buyer-synthetic-v1", data: deterministicBuyerInformation, documentChecklist: deterministicBuyerDocuments, provenanceVersion: "seed-v1", disclosureVersion: "prototype-disclosure-v1" };
      await tx.buyerInformationSnapshot.create({ data: { applicationId: app.id, ...information, contentHash: buyerInformationContentHash(information) } });
      await tx.notification.create({ data: { userId: syntheticBuyerId, applicationId: app.id, href: `/buyer?application=${app.id}`, message: "Synthetic action required: Ananya has invited you to review KA01AB1234." } });
      await tx.workflowEvent.create({ data: { applicationId: app.id, version: app.aggregateVersion + 1, eventType: "BUYER_INVITED" } }); await tx.auditEvent.create({ data: { applicationId: app.id, actorId, action: "INVITE_BUYER" } });
      const result = { applicationId: app.id, state: "BUYER_ACTION_REQUIRED", aggregateVersion: app.aggregateVersion + 1 }; await tx.commandReceipt.create({ data: { scope: `application:${app.id}`, actorId, command: "InviteBuyer", idempotencyKey: input.idempotencyKey, requestHash, result, aggregateVersion: app.aggregateVersion + 1, applicationId: app.id } }); return result;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
  async acceptBuyer(actorId: string, raw: unknown) {
    const input = acceptSchema.parse(raw); const requestHash = hash(input);
    const outcome = await this.db.$transaction(async (tx) => {
      const prior = await tx.commandReceipt.findUnique({ where: { scope_actorId_command_idempotencyKey: { scope: `application:${input.applicationId}`, actorId, command: "CompleteBuyerAcceptance", idempotencyKey: input.idempotencyKey } } });
      if (prior) { if (prior.requestHash !== requestHash) throw new Error("This intent key was already used with different input."); return prior.result; }
      const app = await tx.application.findUnique({ where: { id: input.applicationId }, include: { participants: true, sellerDeclaration: { include: { readiness: true } }, readinessResults: { orderBy: { createdAt: "desc" }, take: 1 }, buyerInformation: true } });
      const readiness = app?.sellerDeclaration?.readiness;
      const expectedInformationHash = app?.buyerInformation ? buyerInformationContentHash(app.buyerInformation) : "";
      if (!app || app.state !== "BUYER_ACTION_REQUIRED" || app.aggregateVersion !== input.expectedVersion || !app.sellerDeclaration || !app.buyerInformation || app.buyerInformation.contentHash !== expectedInformationHash || !syntheticDocumentsComplete(app.buyerInformation.documentChecklist) || !app.participants.some((p) => p.userId === actorId && p.role === "BUYER") || actorId !== syntheticBuyerId || !sellerReadinessIsCurrentAndReady({ currentReadinessId: app.readinessResults[0]?.id, declaredReadinessId: readiness?.id, status: readiness?.status, ruleBodyHash: readiness?.ruleBodyHash, pinnedRuleBodyHash: app.ruleBodyHash })) throw new Error("Refresh the buyer review before continuing.");
      const updated = await tx.application.updateMany({ where: { id: app.id, state: "BUYER_ACTION_REQUIRED", aggregateVersion: input.expectedVersion }, data: { state: "BUYER_VERIFIED", aggregateVersion: { increment: 1 } } }); if (updated.count !== 1) throw new Error("This transfer changed. Refresh and try again.");
      await tx.buyerDeclaration.create({ data: { applicationId: app.id, buyerInformationId: app.buyerInformation.id, statementVersion: "buyer-prototype-v1", statementSnapshot: buyerStatement } }); await tx.workflowEvent.create({ data: { applicationId: app.id, version: app.aggregateVersion + 1, eventType: "BUYER_ACCEPTED" } }); await tx.auditEvent.create({ data: { applicationId: app.id, actorId, action: "COMPLETE_BUYER_ACCEPTANCE" } });
      const result = { applicationId: app.id, state: "BUYER_VERIFIED", aggregateVersion: app.aggregateVersion + 1 }; await tx.commandReceipt.create({ data: { scope: `application:${app.id}`, actorId, command: "CompleteBuyerAcceptance", idempotencyKey: input.idempotencyKey, requestHash, result, aggregateVersion: app.aggregateVersion + 1, applicationId: app.id } }); return result;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return outcome;
  }
}

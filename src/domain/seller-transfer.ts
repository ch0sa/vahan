import { createHash } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import { z } from "zod";
import { evaluateReadiness } from "./readiness";
import { transition } from "./workflow";
import { MockVehicleRegistryProvider } from "@/src/adapters/mock";
import { ruleSchema } from "./readiness";
import { canonicalHash, canonicalJson } from "./canonical";

const createDraftSchema = z.object({ vehicleId: z.string().min(1), workspaceId: z.string().min(1), idempotencyKey: z.string().min(16).max(200) });
const declarationSchema = z.object({ applicationId: z.string().min(1), readinessResultId: z.string().min(1), idempotencyKey: z.string().min(16).max(200), statementVersion: z.literal("seller-prototype-v1") });
const requestHash = (input: unknown) => createHash("sha256").update(JSON.stringify(input)).digest("hex");
export const sellerStatement = "I confirm this is a synthetic MoveKA prototype declaration. It is not a government eSign, Form 29, or proof of transfer.";

export class SellerTransferService {
  constructor(private readonly db: PrismaClient, private readonly registry = new MockVehicleRegistryProvider()) {}
  async createDraft(actorId: string, raw: unknown) {
    const input = createDraftSchema.parse(raw); const hash = requestHash(input);
    const projection = await this.registry.getVehicle("KA01AB1234");
    const vehicle = await this.db.vehicleProjection.findFirst({ where: { id: input.vehicleId, workspaceId: input.workspaceId }, include: { ownerships: { where: { validUntil: null } } } });
    if (!vehicle || vehicle.ownerships.length !== 1 || projection.id !== vehicle.externalReference || projection.registrationNumber !== vehicle.registrationNumber || projection.ownerId !== actorId || projection.ownerReference !== vehicle.ownerships[0]?.externalReference || projection.source !== "MOCK_VEHICLE_REGISTRY" || projection.sourceVersion !== "seed-v1" || projection.vehicleClass !== "PRIVATE_NON_TRANSPORT" || projection.registrationState !== "KA" || Number.isNaN(projection.lastSyncedAt.getTime()) || vehicle.ownerships[0]?.ownerId !== actorId) throw new Error("Vehicle projection is unavailable or no longer belongs to this prototype account.");
    const outcome = await this.db.$transaction(async (tx) => {
      const receipt = await tx.commandReceipt.findUnique({ where: { scope_actorId_command_idempotencyKey: { scope: `vehicle:${input.vehicleId}`, actorId, command: "CreateTransferDraft", idempotencyKey: input.idempotencyKey } } });
      if (receipt) { if (receipt.requestHash !== hash) throw new Error("This idempotency key was already used with different input."); return receipt.result; }
      const membership = await tx.workspaceMembership.findUnique({ where: { workspaceId_userId: { workspaceId: input.workspaceId, userId: actorId } } });
      if (!membership) throw new Error("This demo workspace is unavailable.");
      const active = await tx.application.findFirst({ where: { workspaceId: input.workspaceId, vehicleProjectionId: input.vehicleId, state: { in: ["DRAFT", "SELLER_ACTION_REQUIRED", "SELLER_VERIFIED"] }, participants: { some: { userId: actorId, role: "SELLER" } } } });
      if (active) { const result = { applicationId: active.id, state: active.state, aggregateVersion: active.aggregateVersion }; await tx.commandReceipt.upsert({ where: { scope_actorId_command_idempotencyKey: { scope: `vehicle:${input.vehicleId}`, actorId, command: "CreateTransferDraft", idempotencyKey: input.idempotencyKey } }, update: {}, create: { scope: `vehicle:${input.vehicleId}`, actorId, command: "CreateTransferDraft", idempotencyKey: input.idempotencyKey, requestHash: hash, result, aggregateVersion: active.aggregateVersion, applicationId: active.id } }); return result; }
      const fresh = await tx.vehicleProjection.findFirst({ where: { id: input.vehicleId, workspaceId: input.workspaceId }, include: { ownerships: { where: { validUntil: null } } } });
      if (!fresh || fresh.ownerships.length !== 1 || fresh.source !== vehicle.source || fresh.sourceVersion !== vehicle.sourceVersion || fresh.ownerships[0]?.ownerId !== actorId) throw new Error("Vehicle data changed. Refresh and try again.");
      const service = await tx.serviceDefinition.findUnique({ where: { key_version: { key: "SYNTHETIC_PRIVATE_VEHICLE_TRANSFER", version: "demo-v1" } }, include: { rules: true } });
      const rule = service?.rules.length === 1 ? service.rules[0] : null;
      if (!service || !rule || !ruleSchema.safeParse(rule.body).success) throw new Error("Synthetic service configuration is unavailable.");
      const snapshot = JSON.parse(canonicalJson(rule.body)); const ruleHash = canonicalHash(snapshot);
      const app = await tx.application.create({ data: { workspaceId: input.workspaceId, vehicleProjectionId: fresh.id, serviceDefinitionId: service.id, serviceRuleId: rule.id, ruleVersion: "demo-v1", ruleBodySnapshot: snapshot, ruleBodyHash: ruleHash, participants: { create: { userId: actorId, role: "SELLER" } }, workflowEvents: { create: { version: 0, eventType: "DRAFT_CREATED" } }, auditEvents: { create: { actorId, action: "CREATE_TRANSFER_DRAFT" } } } });
      const result = { applicationId: app.id, state: app.state, aggregateVersion: app.aggregateVersion };
      await tx.commandReceipt.create({ data: { scope: `vehicle:${input.vehicleId}`, actorId, command: "CreateTransferDraft", idempotencyKey: input.idempotencyKey, requestHash: hash, result, aggregateVersion: app.aggregateVersion, applicationId: app.id } });
      return result;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return outcome;
  }
  async evaluateReadiness(actorId: string, input: { applicationId: string; idempotencyKey: string; expectedVersion: number }) {
    const hash = requestHash(input);
    const outcome = await this.db.$transaction(async (tx) => {
      const prior = await tx.commandReceipt.findUnique({ where: { scope_actorId_command_idempotencyKey: { scope: `application:${input.applicationId}`, actorId, command: "EvaluateReadiness", idempotencyKey: input.idempotencyKey } } });
      if (prior) { if (prior.requestHash !== hash) throw new Error("This intent key was already used with different input."); return prior.result; }
      const app = await tx.application.findUnique({ where: { id: input.applicationId }, include: { vehicle: { include: { ownerships: { where: { validUntil: null } } } }, service: { include: { rules: true } }, participants: true } });
      if (!app || app.participants.find((p) => p.userId === actorId && p.role === "SELLER") === undefined || app.vehicle.ownerships[0]?.ownerId !== actorId) throw new Error("You cannot access this transfer.");
      const next = transition({ state: app.state, command: "START_SELLER_STEP", actor: "SELLER" }); if (!next.allowed && app.state !== "SELLER_ACTION_REQUIRED") throw new Error(next.reason);
      const result = evaluateReadiness({ registrationNumber: app.vehicle.registrationNumber, ownerId: actorId, source: app.vehicle.source, sourceVersion: app.vehicle.sourceVersion, vehicleClass: app.vehicle.vehicleClass, registrationState: app.vehicle.registrationState }, app.ruleBodySnapshot);
      if (app.aggregateVersion !== input.expectedVersion) throw new Error("This transfer changed. Refresh and review it.");
      const readiness = await tx.readinessResult.create({ data: { applicationId: app.id, serviceDefinitionId: app.serviceDefinitionId, status: result.status, processingMode: result.processingMode, inputs: { vehicleId: app.vehicleProjectionId }, findings: result.findings, ruleBodyHash: result.ruleBodyHash, evaluatorVersion: result.evaluatorVersion, provenanceVersion: app.vehicle.sourceVersion ?? "unknown", disclosureVersion: result.disclosureVersion } });
      const updated = await tx.application.updateMany({ where: { id: app.id, aggregateVersion: input.expectedVersion }, data: { state: "SELLER_ACTION_REQUIRED", aggregateVersion: { increment: 1 } } });
      if (updated.count !== 1) throw new Error("This transfer changed. Refresh and review it.");
      await tx.workflowEvent.create({ data: { applicationId: app.id, version: app.aggregateVersion + 1, eventType: "READINESS_EVALUATED" } }); await tx.auditEvent.create({ data: { applicationId: app.id, actorId, action: "EVALUATE_READINESS" } });
      const resultValue = { readinessResultId: readiness.id, applicationId: app.id, aggregateVersion: app.aggregateVersion + 1 }; await tx.commandReceipt.create({ data: { scope: `application:${app.id}`, actorId, command: "EvaluateReadiness", idempotencyKey: input.idempotencyKey, requestHash: hash, result: resultValue, aggregateVersion: app.aggregateVersion + 1, applicationId: app.id } });
      return resultValue;
    });
    return outcome;
  }
  declarationInput = declarationSchema;
  async completeSellerDeclaration(actorId: string, raw: unknown) {
    const input = declarationSchema.parse(raw); const hash = requestHash(input);
    const outcome = await this.db.$transaction(async (tx) => {
      const prior = await tx.commandReceipt.findUnique({ where: { scope_actorId_command_idempotencyKey: { scope: `application:${input.applicationId}`, actorId, command: "CompleteSellerDeclaration", idempotencyKey: input.idempotencyKey } } });
      if (prior) { if (prior.requestHash !== hash) throw new Error("This intent key was already used with different input."); return prior.result; }
      const app = await tx.application.findUnique({ where: { id: input.applicationId }, include: { participants: true, vehicle: { include: { ownerships: { where: { validUntil: null } } } }, readinessResults: { where: { id: input.readinessResultId } } } });
      if (!app || app.state !== "SELLER_ACTION_REQUIRED" || !app.participants.some((p) => p.userId === actorId && p.role === "SELLER") || app.vehicle.ownerships[0]?.ownerId !== actorId) throw new Error("Refresh the seller transfer before continuing.");
      const readiness = app.readinessResults[0];
      if (!readiness || readiness.status !== "READY_FOR_DEMO" || readiness.ruleBodyHash !== app.ruleBodyHash) throw new Error("The current synthetic readiness result is not ready. Refresh and review it.");
      const updated = await tx.application.updateMany({ where: { id: app.id, state: "SELLER_ACTION_REQUIRED", aggregateVersion: app.aggregateVersion }, data: { state: "SELLER_VERIFIED", aggregateVersion: { increment: 1 } } });
      if (updated.count !== 1) throw new Error("This transfer changed in another tab. Refresh and review it.");
      await tx.sellerDeclaration.create({ data: { applicationId: app.id, readinessResultId: readiness.id, statementVersion: input.statementVersion, statementSnapshot: sellerStatement } });
      await tx.workflowEvent.create({ data: { applicationId: app.id, version: app.aggregateVersion + 1, eventType: "SELLER_DECLARATION_COMPLETED" } });
      await tx.auditEvent.create({ data: { applicationId: app.id, actorId, action: "COMPLETE_SELLER_DECLARATION" } });
      const result = { applicationId: app.id, state: "SELLER_VERIFIED", aggregateVersion: app.aggregateVersion + 1 };
      await tx.commandReceipt.create({ data: { scope: `application:${app.id}`, actorId, command: "CompleteSellerDeclaration", idempotencyKey: input.idempotencyKey, requestHash: hash, result, aggregateVersion: app.aggregateVersion + 1, applicationId: app.id } });
      return result;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return outcome;
  }
}

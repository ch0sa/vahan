import { Prisma, UserRole, type PrismaClient } from "@prisma/client";
import { z } from "zod";
import { canonicalHash } from "./canonical";

const newJourneySchema = z.object({ workspaceId: z.string().min(1), idempotencyKey: z.string().min(16).max(200) });
const resetSchema = newJourneySchema.extend({ confirmation: z.literal("RESET") });
const defaultSellerId = "synthetic-ananya-rao";
const defaultRegistration = "KA01AB1234";

export function canManageDemoWorkspace(input: { userRole: UserRole; isMember: boolean }) {
  return input.userRole === UserRole.CITIZEN && input.isMember;
}

export function workspaceReceiptScope(workspaceId: string) { return `workspace:${workspaceId}`; }
export function demoWorkspaceLabel(workspaceId: string) { return `Demo journey ${workspaceId.replace(/[^a-z0-9]/gi, "").slice(-6).toUpperCase()}`; }

export class DemoWorkspaceService {
  constructor(private readonly db: PrismaClient) {}

  async createNewJourney(actorId: string, raw: unknown) {
    const input = newJourneySchema.parse(raw); const requestHash = canonicalHash(input);
    return this.db.$transaction(async (tx) => {
      const prior = await tx.commandReceipt.findUnique({ where: { scope_actorId_command_idempotencyKey: { scope: workspaceReceiptScope(input.workspaceId), actorId, command: "CreateDemoWorkspace", idempotencyKey: input.idempotencyKey } } });
      if (prior) { if (prior.requestHash !== requestHash) throw new Error("This workspace intent was already used with different input."); return prior.result; }
      const source = await tx.workspace.findUnique({ where: { id: input.workspaceId }, include: { memberships: true } });
      const user = await tx.user.findUnique({ where: { id: actorId }, select: { role: true } });
      if (!source || !user || !canManageDemoWorkspace({ userRole: user.role, isMember: source.memberships.some((member) => member.userId === actorId) })) throw new Error("This demo workspace is unavailable.");
      if (!source.memberships.some((member) => member.userId === defaultSellerId)) throw new Error("The synthetic seller is unavailable in this workspace.");
      const createdWorkspace = await tx.workspace.create({ data: { label: "Demo journey", memberships: { create: source.memberships.map((member) => ({ userId: member.userId, role: member.role })) } } });
      const workspace = await tx.workspace.update({ where: { id: createdWorkspace.id }, data: { label: demoWorkspaceLabel(createdWorkspace.id) } });
      await this.createFreshVehicle(tx, workspace.id);
      const result = { workspaceId: workspace.id, resetVersion: workspace.resetVersion, created: true };
      await tx.commandReceipt.create({ data: { scope: workspaceReceiptScope(input.workspaceId), actorId, command: "CreateDemoWorkspace", idempotencyKey: input.idempotencyKey, requestHash, result, aggregateVersion: 0, workspaceId: input.workspaceId } });
      await tx.auditEvent.create({ data: { actorId, action: "CREATE_DEMO_WORKSPACE", payload: { sourceWorkspaceId: input.workspaceId, workspaceId: workspace.id } } });
      return result;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async resetWorkspace(actorId: string, raw: unknown) {
    const input = resetSchema.parse(raw); const requestHash = canonicalHash(input);
    return this.db.$transaction(async (tx) => {
      const prior = await tx.commandReceipt.findUnique({ where: { scope_actorId_command_idempotencyKey: { scope: workspaceReceiptScope(input.workspaceId), actorId, command: "ResetDemoWorkspace", idempotencyKey: input.idempotencyKey } } });
      if (prior) { if (prior.requestHash !== requestHash) throw new Error("This workspace intent was already used with different input."); return prior.result; }
      const workspace = await tx.workspace.findUnique({ where: { id: input.workspaceId }, include: { memberships: true, vehicles: { select: { id: true } } } });
      const user = await tx.user.findUnique({ where: { id: actorId }, select: { role: true } });
      if (!workspace || !user || !canManageDemoWorkspace({ userRole: user.role, isMember: workspace.memberships.some((member) => member.userId === actorId) })) throw new Error("This demo workspace is unavailable.");
      if (!workspace.memberships.some((member) => member.userId === defaultSellerId)) throw new Error("The synthetic seller is unavailable in this workspace.");
      await tx.application.deleteMany({ where: { workspaceId: workspace.id } });
      await tx.vehicleOwnership.deleteMany({ where: { vehicleProjectionId: { in: workspace.vehicles.map((vehicle) => vehicle.id) } } });
      await tx.vehicleProjection.deleteMany({ where: { workspaceId: workspace.id } });
      const updated = await tx.workspace.updateMany({ where: { id: workspace.id, resetVersion: workspace.resetVersion }, data: { resetVersion: { increment: 1 } } });
      if (updated.count !== 1) throw new Error("This workspace changed. Refresh and try again.");
      await this.createFreshVehicle(tx, workspace.id);
      const result = { workspaceId: workspace.id, resetVersion: workspace.resetVersion + 1, reset: true };
      await tx.commandReceipt.create({ data: { scope: workspaceReceiptScope(workspace.id), actorId, command: "ResetDemoWorkspace", idempotencyKey: input.idempotencyKey, requestHash, result, aggregateVersion: workspace.resetVersion + 1, workspaceId: workspace.id } });
      await tx.auditEvent.create({ data: { actorId, action: "RESET_DEMO_WORKSPACE", payload: { workspaceId: workspace.id, resetVersion: workspace.resetVersion + 1 } } });
      return result;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  private async createFreshVehicle(tx: Prisma.TransactionClient, workspaceId: string) {
    const vehicle = await tx.vehicleProjection.create({ data: { workspaceId, registrationNumber: defaultRegistration, source: "MOCK_VEHICLE_REGISTRY", externalReference: "synthetic-vehicle-ka01ab1234", sourceVersion: "seed-v1", vehicleClass: "PRIVATE_NON_TRANSPORT", registrationState: "KA", lastSyncedAt: new Date("2026-08-20T00:00:00.000Z") } });
    await tx.vehicleOwnership.create({ data: { vehicleProjectionId: vehicle.id, ownerId: defaultSellerId, validFrom: new Date("2020-01-01T00:00:00.000Z"), source: "MOCK_VEHICLE_REGISTRY", externalReference: "synthetic-ownership-v1", observedAt: new Date("2026-08-20T00:00:00.000Z") } });
    return vehicle;
  }
}

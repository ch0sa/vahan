import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();
const fixedTime = new Date("2026-08-20T00:00:00.000Z");

async function main() {
  const ananya = await prisma.user.upsert({ where: { id: "synthetic-ananya-rao" }, update: { displayName: "Ananya Rao" }, create: { id: "synthetic-ananya-rao", displayName: "Ananya Rao", role: UserRole.CITIZEN, profile: { create: { locale: "en" } } } });
  const rahul = await prisma.user.upsert({ where: { id: "synthetic-rahul-shetty" }, update: { displayName: "Rahul Shetty" }, create: { id: "synthetic-rahul-shetty", displayName: "Rahul Shetty", role: UserRole.CITIZEN, profile: { create: { locale: "en" } } } });
  const operator = await prisma.user.upsert({ where: { id: "synthetic-demo-operator" }, update: { displayName: "Demo Operator", role: UserRole.DEMO_OPERATOR }, create: { id: "synthetic-demo-operator", displayName: "Demo Operator", role: UserRole.DEMO_OPERATOR, profile: { create: { locale: "en" } } } });
  const workspace = await prisma.workspace.upsert({ where: { id: "synthetic-workspace-default" }, update: { label: "Ownership transfer demo" }, create: { id: "synthetic-workspace-default", label: "Ownership transfer demo" } });
  for (const userId of [ananya.id, rahul.id, operator.id]) await prisma.workspaceMembership.upsert({ where: { workspaceId_userId: { workspaceId: workspace.id, userId } }, update: {}, create: { workspaceId: workspace.id, userId } });
  const vehicle = await prisma.vehicleProjection.upsert({ where: { workspaceId_registrationNumber: { workspaceId: workspace.id, registrationNumber: "KA01AB1234" } }, update: { source: "MOCK_VEHICLE_REGISTRY", sourceVersion: "seed-v1", vehicleClass: "PRIVATE_NON_TRANSPORT", registrationState: "KA", lastSyncedAt: fixedTime }, create: { id: "synthetic-vehicle-ka01ab1234", workspaceId: workspace.id, registrationNumber: "KA01AB1234", source: "MOCK_VEHICLE_REGISTRY", externalReference: "synthetic-vehicle-ka01ab1234", sourceVersion: "seed-v1", vehicleClass: "PRIVATE_NON_TRANSPORT", registrationState: "KA", lastSyncedAt: fixedTime } });
  await prisma.vehicleOwnership.upsert({ where: { id: "synthetic-ownership-ananya-ka01ab1234" }, update: {}, create: { id: "synthetic-ownership-ananya-ka01ab1234", vehicleProjectionId: vehicle.id, ownerId: ananya.id, validFrom: new Date("2020-01-01T00:00:00.000Z"), source: "MOCK_VEHICLE_REGISTRY", externalReference: "synthetic-ownership-v1", observedAt: fixedTime } });
  const service = await prisma.serviceDefinition.upsert({ where: { key_version: { key: "SYNTHETIC_PRIVATE_VEHICLE_TRANSFER", version: "demo-v1" } }, update: {}, create: { key: "SYNTHETIC_PRIVATE_VEHICLE_TRANSFER", version: "demo-v1", processingMode: "DEMO_RTO_HANDOVER", provenance: "RUN 5 deterministic synthetic rule" } });
  await prisma.serviceRule.upsert({ where: { serviceDefinitionId_version: { serviceDefinitionId: service.id, version: "demo-v1" } }, update: {}, create: { serviceDefinitionId: service.id, version: "demo-v1", body: { scenario: "KA01AB1234", owner: "synthetic-ananya-rao", source: "MOCK_VEHICLE_REGISTRY" } } });
  console.log("Seeded deterministic synthetic users Ananya Rao and Rahul Shetty, and vehicle KA01AB1234.");
}
main().finally(() => prisma.$disconnect());

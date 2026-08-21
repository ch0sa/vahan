import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const runId = randomUUID();
const vehicleId = `integration-vehicle-${runId}`;
const registrationNumber = `IT${runId.replaceAll("-", "").slice(0, 10).toUpperCase()}`;
const workspaceId = "synthetic-workspace-default";

function assertExactlyOneSucceeded(results: PromiseSettledResult<unknown>[], label: string) {
  const fulfilled = results.filter((result) => result.status === "fulfilled").length;
  const rejected = results.filter((result) => result.status === "rejected").length;
  if (fulfilled !== 1 || rejected !== 1) throw new Error(`${label}: expected one success and one database rejection, got ${fulfilled}/${rejected}.`);
}

async function main() {
  const [service, rule] = await Promise.all([
    prisma.serviceDefinition.findUniqueOrThrow({ where: { key_version: { key: "SYNTHETIC_PRIVATE_VEHICLE_TRANSFER", version: "demo-v1" } } }),
    prisma.serviceRule.findFirstOrThrow({ where: { version: "demo-v1" } }),
  ]);

  await prisma.vehicleProjection.create({
    data: {
      id: vehicleId,
      workspaceId,
      registrationNumber,
      source: "INTEGRATION_TEST",
      externalReference: `integration:${runId}`,
      sourceVersion: "test-v1",
      lastSyncedAt: new Date(),
      ownerships: {
        create: {
          ownerId: "synthetic-ananya-rao",
          validFrom: new Date("2026-01-01T00:00:00.000Z"),
          validUntil: new Date("2026-06-01T00:00:00.000Z"),
          source: "INTEGRATION_TEST",
          externalReference: `integration-owner:${runId}:1`,
          observedAt: new Date(),
        },
      },
    },
  });

  try {
    const overlap = await Promise.allSettled([
      prisma.vehicleOwnership.create({ data: { vehicleProjectionId: vehicleId, ownerId: "synthetic-ananya-rao", validFrom: new Date("2026-05-01T00:00:00.000Z"), validUntil: new Date("2026-07-01T00:00:00.000Z"), source: "INTEGRATION_TEST", externalReference: `integration-owner:${runId}:overlap`, observedAt: new Date() } }),
    ]);
    if (overlap[0].status !== "rejected") throw new Error("Overlapping vehicle ownership was not rejected by PostgreSQL.");

    const appData = (suffix: string) => ({
      id: `integration-app-${runId}-${suffix}`,
      workspaceId,
      vehicleProjectionId: vehicleId,
      serviceDefinitionId: service.id,
      serviceRuleId: rule.id,
      state: "DRAFT" as const,
      ruleVersion: "demo-v1",
      ruleBodyHash: `integration-hash-${runId}`,
      ruleBodySnapshot: { synthetic: true },
    });
    const activeApps = await Promise.allSettled([
      prisma.application.create({ data: appData("a") }),
      prisma.application.create({ data: appData("b") }),
    ]);
    assertExactlyOneSucceeded(activeApps, "Concurrent active-transfer constraint");
    const app = await prisma.application.findFirstOrThrow({ where: { vehicleProjectionId: vehicleId } });

    const pricing = await prisma.pricingSnapshot.create({ data: { applicationId: app.id, amountMinor: 100, currency: "INR", label: "Synthetic integration value; not an official fee", disclosureVersion: "test-v1", ruleVersion: "demo-v1", contentHash: `integration:${runId}` } });
    const payment = await prisma.payment.create({ data: { applicationId: app.id, pricingSnapshotId: pricing.id, amountMinor: 100, currency: "INR", status: "CONFIRMED" } });
    const confirmations = await Promise.allSettled([
      prisma.paymentAttempt.create({ data: { paymentId: payment.id, attemptNumber: 1, idempotencyKey: `integration:${runId}:1`, providerReference: `integration-provider:${runId}:1`, status: "CONFIRMED" } }),
      prisma.paymentAttempt.create({ data: { paymentId: payment.id, attemptNumber: 2, idempotencyKey: `integration:${runId}:2`, providerReference: `integration-provider:${runId}:2`, status: "CONFIRMED" } }),
    ]);
    assertExactlyOneSucceeded(confirmations, "Concurrent confirmed-payment constraint");

    console.log("PostgreSQL integration passed: exclusion and concurrent partial-unique constraints are enforced.");
  } finally {
    await prisma.paymentAttempt.deleteMany({ where: { payment: { application: { vehicleProjectionId: vehicleId } } } });
    await prisma.payment.deleteMany({ where: { application: { vehicleProjectionId: vehicleId } } });
    await prisma.pricingSnapshot.deleteMany({ where: { application: { vehicleProjectionId: vehicleId } } });
    await prisma.application.deleteMany({ where: { vehicleProjectionId: vehicleId } });
    await prisma.vehicleOwnership.deleteMany({ where: { vehicleProjectionId: vehicleId } });
    await prisma.vehicleProjection.delete({ where: { id: vehicleId } }).catch(() => undefined);
  }
}

main().finally(() => prisma.$disconnect());

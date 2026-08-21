import { PrismaClient } from "@prisma/client";
import { SellerTransferService } from "../src/domain/seller-transfer";

const prisma = new PrismaClient();

async function main() {
  const vehicle = await prisma.vehicleProjection.findUnique({
    where: { workspaceId_registrationNumber: { workspaceId: "synthetic-workspace-default", registrationNumber: "KA01AB1234" } },
    select: { id: true },
  });
  if (!vehicle) throw new Error("Seeded vehicle fixture is unavailable.");
  const result = await new SellerTransferService(prisma).createDraft("synthetic-ananya-rao", {
    workspaceId: "synthetic-workspace-default",
    vehicleId: vehicle.id,
    idempotencyKey: "ci-seeded-seller-draft-smoke-v1",
  }) as { applicationId?: string; state?: string };
  if (!result.applicationId || result.state !== "DRAFT") throw new Error("Seeded seller draft smoke test failed.");
  const persisted = await prisma.application.findFirst({
    where: { id: result.applicationId, participants: { some: { userId: "synthetic-ananya-rao", role: "SELLER" } } },
  });
  if (!persisted) throw new Error("Seller draft was not persisted for the seeded seller.");
  console.log("Database smoke passed: seeded seller created and persisted a transfer draft.");
}

main().finally(() => prisma.$disconnect());

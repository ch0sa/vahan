import { PrismaClient } from "@prisma/client";
import { DemoWorkspaceService } from "../src/domain/demo-workspace";
import { SellerTransferService } from "../src/domain/seller-transfer";

const prisma = new PrismaClient();

function applicationIdFrom(result: unknown) {
  if (
    typeof result !== "object" ||
    result === null ||
    !("applicationId" in result) ||
    typeof result.applicationId !== "string"
  ) {
    throw new Error("A draft command did not return an application ID.");
  }
  return result.applicationId;
}

async function main() {
  const workspaces = new DemoWorkspaceService(prisma);
  const transfers = new SellerTransferService(prisma);
  const sellerId = "synthetic-ananya-rao";
  const defaultWorkspaceId = "synthetic-workspace-default";

  const defaultVehicle = await prisma.vehicleProjection.findUniqueOrThrow({
    where: {
      workspaceId_registrationNumber: {
        workspaceId: defaultWorkspaceId,
        registrationNumber: "KA01AB1234",
      },
    },
  });
  const defaultDraft = await transfers.createDraft(sellerId, {
    workspaceId: defaultWorkspaceId,
    vehicleId: defaultVehicle.id,
    idempotencyKey: "workspace-integration-default-draft",
  });
  const defaultApplicationId = applicationIdFrom(defaultDraft);

  const created = (await workspaces.createNewJourney(sellerId, {
    workspaceId: defaultWorkspaceId,
    idempotencyKey: "workspace-integration-create-journey",
  })) as { workspaceId: string };
  const isolatedWorkspaceId = created.workspaceId;
  const isolatedVehicle = await prisma.vehicleProjection.findUniqueOrThrow({
    where: {
      workspaceId_registrationNumber: {
        workspaceId: isolatedWorkspaceId,
        registrationNumber: "KA01AB1234",
      },
    },
    include: { ownerships: true },
  });

  if (
    isolatedVehicle.externalReference !== "synthetic-vehicle-ka01ab1234" ||
    isolatedVehicle.ownerships.length !== 1 ||
    isolatedVehicle.ownerships[0]?.ownerId !== sellerId
  ) {
    throw new Error("A new workspace did not receive the expected fresh vehicle projection.");
  }

  const isolatedDraft = await transfers.createDraft(sellerId, {
    workspaceId: isolatedWorkspaceId,
    vehicleId: isolatedVehicle.id,
    idempotencyKey: "workspace-integration-isolated-draft",
  });
  const isolatedApplicationId = applicationIdFrom(isolatedDraft);
  const resetInput = {
    workspaceId: isolatedWorkspaceId,
    confirmation: "RESET",
    idempotencyKey: "workspace-integration-reset-journey",
  } as const;
  await workspaces.resetWorkspace(sellerId, resetInput);
  const repeatedReset = (await workspaces.resetWorkspace(sellerId, resetInput)) as {
    resetVersion: number;
  };

  const [defaultStillPresent, isolatedRemoved, freshVehicleCount, workspaceCount] =
    await Promise.all([
      prisma.application.count({
        where: { id: defaultApplicationId, workspaceId: defaultWorkspaceId },
      }),
      prisma.application.count({
        where: { id: isolatedApplicationId, workspaceId: isolatedWorkspaceId },
      }),
      prisma.vehicleProjection.count({
        where: {
          workspaceId: isolatedWorkspaceId,
          registrationNumber: "KA01AB1234",
          ownerships: { some: { ownerId: sellerId, validUntil: null } },
        },
      }),
      prisma.workspace.count(),
    ]);

  if (
    defaultStillPresent !== 1 ||
    isolatedRemoved !== 0 ||
    freshVehicleCount !== 1 ||
    workspaceCount !== 2 ||
    repeatedReset.resetVersion !== 1
  ) {
    throw new Error(
      `Workspace isolation failed: ${JSON.stringify({
        defaultStillPresent,
        isolatedRemoved,
        freshVehicleCount,
        workspaceCount,
        repeatedReset,
      })}`,
    );
  }

  let operatorDenied = false;
  try {
    await workspaces.resetWorkspace("synthetic-demo-operator", {
      workspaceId: isolatedWorkspaceId,
      confirmation: "RESET",
      idempotencyKey: "workspace-integration-operator-denied",
    });
  } catch {
    operatorDenied = true;
  }
  if (!operatorDenied) throw new Error("The demo operator was allowed to reset a citizen workspace.");

  console.log(
    "Workspace integration passed: new run, fresh draft, scoped reset, idempotent replay, and operator denial.",
  );
}

main().finally(() => prisma.$disconnect());

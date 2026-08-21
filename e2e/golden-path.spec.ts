import { expect, test, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function resetSyntheticJourney() {
  await prisma.operatorAction.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditEvent.deleteMany();
  await prisma.paymentProviderEvent.deleteMany();
  await prisma.inboxEvent.deleteMany();
  await prisma.externalEventCursor.deleteMany();
  await prisma.outboxMessage.deleteMany();
  await prisma.commandReceipt.deleteMany();
  await prisma.application.deleteMany();
  await prisma.session.deleteMany();
  await prisma.totpCredential.deleteMany();
  const vehicle = await prisma.vehicleProjection.findUniqueOrThrow({ where: { workspaceId_registrationNumber: { workspaceId: "synthetic-workspace-default", registrationNumber: "KA01AB1234" } } });
  await prisma.vehicleOwnership.deleteMany({ where: { vehicleProjectionId: vehicle.id } });
  await prisma.vehicleOwnership.create({ data: { id: "synthetic-ownership-ananya-ka01ab1234", vehicleProjectionId: vehicle.id, ownerId: "synthetic-ananya-rao", validFrom: new Date("2020-01-01T00:00:00.000Z"), source: "MOCK_VEHICLE_REGISTRY", externalReference: "synthetic-ownership-v1", observedAt: new Date("2026-08-20T00:00:00.000Z") } });
}

async function signIn(page: Page, userId: string) {
  await page.goto("/auth/sign-in");
  await page.getByLabel("Account").selectOption(userId);
  await page.getByLabel("Demo password").fill("admin");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "You are signed in" })).toBeVisible();
}

test("complete synthetic seller-to-registry golden path", async ({ browser }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Golden path runs once on desktop; responsive coverage is separate.");
  test.skip(!process.env.E2E_RESET_DATABASE, "Destructive database reset requires explicit E2E_RESET_DATABASE opt-in.");
  test.setTimeout(120_000);
  await resetSyntheticJourney();

  const sellerContext = await browser.newContext();
  const buyerContext = await browser.newContext();
  const seller = await sellerContext.newPage();
  const buyer = await buyerContext.newPage();
  seller.setDefaultTimeout(10_000);
  buyer.setDefaultTimeout(10_000);
  try {
    await signIn(seller, "synthetic-ananya-rao");
    await signIn(buyer, "synthetic-rahul-shetty");

    await seller.goto("/dashboard");
    await seller.getByRole("button", { name: "Start a new journey" }).click();
    await seller.goto("/seller");
    await seller.getByRole("button", { name: /Start ownership transfer/ }).click();
    await seller.getByRole("button", { name: "Check vehicle details" }).click();
    await seller.getByRole("button", { name: "Confirm and continue" }).click();
    await seller.getByRole("button", { name: "Send to Rahul" }).click();
    await expect(seller.getByText(/Your step is complete\. Switch to Rahul/)).toBeVisible();

    const invited = await prisma.application.findFirstOrThrow({ where: { state: "BUYER_ACTION_REQUIRED", workspace: { memberships: { some: { userId: "synthetic-rahul-shetty" } } } }, orderBy: { updatedAt: "desc" }, select: { id: true, workspaceId: true } });
    await buyer.goto("/dashboard");
    await buyer.getByLabel("Choose a saved journey").selectOption(invited.workspaceId);
    await buyer.getByRole("button", { name: "Open selected journey" }).click();
    await buyer.getByRole("button", { name: "Accept and continue" }).click();
    await buyer.getByRole("link", { name: "Continue to payment" }).click();
    await buyer.getByRole("button", { name: "Confirm demo payment" }).click();
    await buyer.getByRole("button", { name: "Submit application" }).click();
    await expect(buyer.getByRole("status")).toContainText("Application submitted");
    await buyer.getByRole("button", { name: "Complete demo journey" }).click();
    await expect(buyer.getByRole("heading", { name: "Ownership transfer journey complete" })).toBeVisible();
  } finally {
    await Promise.allSettled([
      sellerContext.close(),
      buyerContext.close(),
    ]);
  }
});

test.afterAll(async () => prisma.$disconnect());

-- Forward-only workspace isolation for reusable synthetic demo runs.
-- Existing rows are preserved in the deterministic default workspace.
CREATE TYPE "WorkspaceMemberRole" AS ENUM ('MEMBER');

CREATE TABLE "Workspace" (
  "id" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "resetVersion" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkspaceMembership" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "WorkspaceMemberRole" NOT NULL DEFAULT 'MEMBER',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkspaceMembership_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WorkspaceMembership_workspaceId_userId_key" ON "WorkspaceMembership"("workspaceId", "userId");
CREATE INDEX "WorkspaceMembership_userId_workspaceId_idx" ON "WorkspaceMembership"("userId", "workspaceId");

INSERT INTO "Workspace" ("id", "label", "updatedAt")
VALUES ('synthetic-workspace-default', 'Default synthetic demo workspace', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "WorkspaceMembership" ("id", "workspaceId", "userId")
SELECT 'membership:synthetic-workspace-default:' || "id", 'synthetic-workspace-default', "id"
FROM "User"
ON CONFLICT ("workspaceId", "userId") DO NOTHING;

ALTER TABLE "VehicleProjection" ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "Application" ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "CommandReceipt" ADD COLUMN "workspaceId" TEXT;

UPDATE "VehicleProjection" SET "workspaceId" = 'synthetic-workspace-default' WHERE "workspaceId" IS NULL;
UPDATE "Application" SET "workspaceId" = COALESCE((SELECT "workspaceId" FROM "VehicleProjection" WHERE "VehicleProjection"."id" = "Application"."vehicleProjectionId"), 'synthetic-workspace-default') WHERE "workspaceId" IS NULL;
UPDATE "CommandReceipt" SET "workspaceId" = (SELECT "workspaceId" FROM "Application" WHERE "Application"."id" = "CommandReceipt"."applicationId") WHERE "applicationId" IS NOT NULL;

ALTER TABLE "VehicleProjection" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "Application" ALTER COLUMN "workspaceId" SET NOT NULL;

DROP INDEX "VehicleProjection_registrationNumber_key";
CREATE UNIQUE INDEX "VehicleProjection_workspaceId_registrationNumber_key" ON "VehicleProjection"("workspaceId", "registrationNumber");
CREATE INDEX "Application_workspaceId_updatedAt_idx" ON "Application"("workspaceId", "updatedAt");

ALTER TABLE "WorkspaceMembership" ADD CONSTRAINT "WorkspaceMembership_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkspaceMembership" ADD CONSTRAINT "WorkspaceMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VehicleProjection" ADD CONSTRAINT "VehicleProjection_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Application" ADD CONSTRAINT "Application_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommandReceipt" ADD CONSTRAINT "CommandReceipt_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

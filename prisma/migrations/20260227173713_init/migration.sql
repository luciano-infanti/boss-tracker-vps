-- CreateTable
CREATE TABLE "KillRecord" (
    "id" TEXT NOT NULL,
    "worldId" INTEGER NOT NULL,
    "creatureName" TEXT NOT NULL,
    "kills24h" INTEGER NOT NULL,
    "kills7d" INTEGER NOT NULL,
    "effectiveDate" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KillRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KillRecord_effectiveDate_idx" ON "KillRecord"("effectiveDate");

-- CreateIndex
CREATE INDEX "KillRecord_worldId_idx" ON "KillRecord"("worldId");

-- CreateIndex
CREATE UNIQUE INDEX "KillRecord_worldId_creatureName_effectiveDate_key" ON "KillRecord"("worldId", "creatureName", "effectiveDate");

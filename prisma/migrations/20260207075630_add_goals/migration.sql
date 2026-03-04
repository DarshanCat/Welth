-- CreateTable
CREATE TABLE "public"."goals" (
    "id" TEXT NOT NULL,
    "targetAmount" DECIMAL(65,30) NOT NULL,
    "months" INTEGER NOT NULL,
    "monthlySave" DECIMAL(65,30) NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "goals_userId_idx" ON "public"."goals"("userId");

-- AddForeignKey
ALTER TABLE "public"."goals" ADD CONSTRAINT "goals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

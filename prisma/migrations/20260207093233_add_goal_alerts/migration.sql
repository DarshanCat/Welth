/*
  Warnings:

  - You are about to drop the `goals` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."goals" DROP CONSTRAINT "goals_userId_fkey";

-- DropTable
DROP TABLE "public"."goals";

-- CreateTable
CREATE TABLE "public"."Goal" (
    "id" TEXT NOT NULL,
    "targetAmount" DECIMAL(65,30) NOT NULL,
    "months" INTEGER NOT NULL,
    "monthlySave" DECIMAL(65,30) NOT NULL,
    "lastAlertSent" TIMESTAMP(3),
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."Goal" ADD CONSTRAINT "Goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

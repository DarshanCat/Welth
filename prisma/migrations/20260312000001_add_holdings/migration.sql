-- CreateEnum
CREATE TYPE "public"."HoldingType" AS ENUM ('STOCK', 'MUTUAL_FUND', 'ETF');

-- CreateTable
CREATE TABLE "public"."holdings" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "public"."HoldingType" NOT NULL DEFAULT 'STOCK',
    "quantity" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "avgBuyPrice" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "investedAmt" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "exchange" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "holdings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "holdings_userId_idx" ON "public"."holdings"("userId");

-- AddForeignKey
ALTER TABLE "public"."holdings" ADD CONSTRAINT "holdings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
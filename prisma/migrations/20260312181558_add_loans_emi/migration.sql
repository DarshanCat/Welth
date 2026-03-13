-- CreateEnum
CREATE TYPE "public"."LoanType" AS ENUM ('HOME', 'CAR', 'PERSONAL', 'EDUCATION', 'BUSINESS', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."LoanStatus" AS ENUM ('ACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "public"."EmiStatus" AS ENUM ('UPCOMING', 'PENDING', 'MISSED', 'PAID');

-- CreateTable
CREATE TABLE "public"."loans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "loanType" "public"."LoanType" NOT NULL DEFAULT 'PERSONAL',
    "status" "public"."LoanStatus" NOT NULL DEFAULT 'ACTIVE',
    "principal" DECIMAL(65,30) NOT NULL,
    "interestRate" DOUBLE PRECISION NOT NULL,
    "tenureMonths" INTEGER NOT NULL,
    "emiAmount" DECIMAL(65,30) NOT NULL,
    "totalAmount" DECIMAL(65,30) NOT NULL,
    "totalInterest" DECIMAL(65,30) NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."emi_payments" (
    "id" TEXT NOT NULL,
    "installment" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "principal" DECIMAL(65,30) NOT NULL,
    "interest" DECIMAL(65,30) NOT NULL,
    "balance" DECIMAL(65,30) NOT NULL,
    "status" "public"."EmiStatus" NOT NULL DEFAULT 'UPCOMING',
    "paidDate" TIMESTAMP(3),
    "loanId" TEXT NOT NULL,

    CONSTRAINT "emi_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "loans_userId_idx" ON "public"."loans"("userId");

-- CreateIndex
CREATE INDEX "emi_payments_loanId_installment_idx" ON "public"."emi_payments"("loanId", "installment");

-- AddForeignKey
ALTER TABLE "public"."loans" ADD CONSTRAINT "loans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."emi_payments" ADD CONSTRAINT "emi_payments_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "public"."loans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "public"."user_settings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emailBudgetAlert" BOOLEAN NOT NULL DEFAULT true,
    "emailMonthlyReport" BOOLEAN NOT NULL DEFAULT true,
    "emailGoalAlert" BOOLEAN NOT NULL DEFAULT true,
    "whatsappAlerts" BOOLEAN NOT NULL DEFAULT false,
    "whatsappPhone" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "defaultView" TEXT NOT NULL DEFAULT 'dashboard',
    "theme" TEXT NOT NULL DEFAULT 'dark',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_settings_userId_key" ON "public"."user_settings"("userId");

-- AddForeignKey
ALTER TABLE "public"."user_settings" ADD CONSTRAINT "user_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

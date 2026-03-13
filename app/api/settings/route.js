import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";

// We store notification prefs as JSON in a dedicated table.
// Falls back gracefully if the table doesn't exist yet.

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await db.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Try to read from UserSettings table (may not exist yet)
    let settings = null;
    try {
      settings = await db.userSettings.findUnique({ where: { userId: user.id } });
    } catch {
      // table doesn't exist — return defaults
    }

    return NextResponse.json({
      name:    user.name  || "",
      email:   user.email || "",
      imageUrl: user.imageUrl || "",
      notifications: {
        emailBudgetAlert:   settings?.emailBudgetAlert   ?? true,
        emailMonthlyReport: settings?.emailMonthlyReport ?? true,
        emailGoalAlert:     settings?.emailGoalAlert     ?? true,
        whatsappAlerts:     settings?.whatsappAlerts     ?? false,
        whatsappPhone:      settings?.whatsappPhone      ?? "",
      },
      preferences: {
        currency:     settings?.currency     ?? "INR",
        defaultView:  settings?.defaultView  ?? "dashboard",
        theme:        settings?.theme        ?? "dark",
      },
    });
  } catch (err) {
    console.error("[settings GET]", err);
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await db.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const body = await req.json();

    // Update display name in DB and Clerk if changed
    if (body.name && body.name !== user.name) {
      await db.user.update({
        where: { id: user.id },
        data:  { name: body.name },
      });
      try {
        const clerk = await clerkClient();
        const parts = body.name.trim().split(" ");
        await clerk.users.updateUser(userId, {
          firstName: parts[0] || "",
          lastName:  parts.slice(1).join(" ") || "",
        });
      } catch { /* Clerk update is best-effort */ }
    }

    // Upsert notification + preference settings
    const settingsData = {
      emailBudgetAlert:   body.notifications?.emailBudgetAlert   ?? true,
      emailMonthlyReport: body.notifications?.emailMonthlyReport ?? true,
      emailGoalAlert:     body.notifications?.emailGoalAlert     ?? true,
      whatsappAlerts:     body.notifications?.whatsappAlerts     ?? false,
      whatsappPhone:      body.notifications?.whatsappPhone      ?? "",
      currency:           body.preferences?.currency             ?? "INR",
      defaultView:        body.preferences?.defaultView          ?? "dashboard",
      theme:              body.preferences?.theme                ?? "dark",
    };

    try {
      await db.userSettings.upsert({
        where:  { userId: user.id },
        update: settingsData,
        create: { userId: user.id, ...settingsData },
      });
    } catch {
      // Table doesn't exist — skip silently, name update still worked
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[settings PATCH]", err);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
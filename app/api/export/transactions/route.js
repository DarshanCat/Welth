import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";

function escapeCSV(val) {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n"))
    return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function rowToCSV(cols) {
  return cols.map(escapeCSV).join(",");
}

export async function GET(req) {
  try {
    const { userId } = await auth();
    if (!userId) return new Response("Unauthorized", { status: 401 });

    const user = await db.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) return new Response("User not found", { status: 404 });

    const { searchParams } = new URL(req.url);
    const from     = searchParams.get("from");
    const to       = searchParams.get("to");
    const type     = searchParams.get("type");     // INCOME | EXPENSE | all
    const category = searchParams.get("category"); // specific or all
    const accountId = searchParams.get("accountId");

    const where = { userId: user.id };
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to)   where.date.lte = new Date(to + "T23:59:59Z");
    }
    if (type && type !== "all")         where.type     = type;
    if (category && category !== "all") where.category = category;
    if (accountId && accountId !== "all") where.accountId = accountId;

    const transactions = await db.transaction.findMany({
      where,
      orderBy: { date: "desc" },
      include: { account: { select: { name: true } } },
    });

    // ── Build CSV ──────────────────────────────────────────────────────────────
    const headers = ["Date", "Type", "Category", "Description", "Amount (₹)", "Account", "Status", "Recurring"];
    const rows = transactions.map(t => rowToCSV([
      new Date(t.date).toLocaleDateString("en-IN"),
      t.type,
      t.category,
      t.description || "",
      Number(t.amount).toFixed(2),
      t.account?.name || "",
      t.status,
      t.isRecurring ? "Yes" : "No",
    ]));

    const csv = [rowToCSV(headers), ...rows].join("\n");
    const filename = `welth-transactions-${new Date().toISOString().split("T")[0]}.csv`;

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type":        "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("[export/transactions]", err);
    return new Response("Export failed", { status: 500 });
  }
}
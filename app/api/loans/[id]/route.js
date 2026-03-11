import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";

// PATCH /api/loans/[id] — mark EMI payment as PAID or delete loan
export async function PATCH(req, { params }) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await db.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { paymentId, action } = await req.json();

    if (action === "mark_paid" && paymentId) {
      const payment = await db.emiPayment.update({
        where: { id: paymentId },
        data: { status: "PAID", paidDate: new Date() },
      });
      return NextResponse.json({ payment });
    }

    if (action === "mark_missed" && paymentId) {
      const payment = await db.emiPayment.update({
        where: { id: paymentId },
        data: { status: "MISSED" },
      });
      return NextResponse.json({ payment });
    }

    if (action === "close_loan") {
      const loan = await db.loan.update({
        where: { id: params.id },
        data: { status: "CLOSED" },
      });
      return NextResponse.json({ loan });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("[PATCH /api/loans]", err);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

// DELETE /api/loans/[id] — remove loan
export async function DELETE(req, { params }) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await db.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    await db.loan.delete({ where: { id: params.id, userId: user.id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/loans]", err);
    return NextResponse.json({ error: "Failed to delete loan" }, { status: 500 });
  }
}
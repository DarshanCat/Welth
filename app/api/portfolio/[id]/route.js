import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";

export async function DELETE(req, { params }) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await db.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    await db.holding.delete({ where: { id: params.id, userId: user.id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/portfolio]", err);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
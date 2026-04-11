import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://127.0.0.1:8002";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const res = await fetch(`${ML_SERVICE_URL}/ai/stock-screener`, {
      method: "GET",
      next: { revalidate: 3600 * 12 } 
    });

    if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Failed to fetch screener: ${txt}`);
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("[ml/stock-screener]", err);
    return NextResponse.json({ error: "Screener failed" }, { status: 500 });
  }
}

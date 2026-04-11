import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://127.0.0.1:8002";

export async function GET(req) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get("symbol");
    if (!symbol) return NextResponse.json({ error: "Symbol required" }, { status: 400 });

    const res = await fetch(`${ML_SERVICE_URL}/ai/stock-predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol }),
      next: { revalidate: 3600 } 
    });

    if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Failed to fetch prediction: ${txt}`);
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("[ml/stock-predict]", err);
    return NextResponse.json({ error: "Prediction failed" }, { status: 500 });
  }
}

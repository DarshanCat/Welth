import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

const ML_URL = process.env.ADVANCED_AI_URL || "http://127.0.0.1:8002";

export async function POST(req) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    const res = await fetch(`${ML_URL}/ai/trading-plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) throw new Error(`ML error: ${res.status}`);
    const data = await res.json();
    return NextResponse.json(data);

  } catch (err) {
    console.error("[trading-plan proxy error]", err);
    if (err.message?.includes("fetch") || err.name === "TimeoutError") {
      return NextResponse.json({ error: "ML service offline. Please start the Python backend.", offline: true }, { status: 503 });
    }
    return NextResponse.json({ error: "Failed to generate trading plan" }, { status: 500 });
  }
}

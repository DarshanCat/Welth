import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

const ML_URL = process.env.ADVANCED_AI_URL || "http://127.0.0.1:8002";

export async function POST(req) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Forward multipart form with file to Python service
    const formData = await req.formData();
    const file     = formData.get("file");

    if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

    // Validate file type
    const name = file.name?.toLowerCase() || "";
    if (!name.match(/\.(pdf|jpg|jpeg|png|webp)$/)) {
      return NextResponse.json({ error: "Supported: PDF, JPG, PNG, WEBP" }, { status: 400 });
    }

    // Max 10MB
    const bytes = await file.arrayBuffer();
    if (bytes.byteLength > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 413 });
    }

    // Forward to Python service
    const fwd = new FormData();
    fwd.append("file", new Blob([bytes], { type: file.type }), file.name);

    const res = await fetch(`${ML_URL}/bank-parse/pdf`, {
      method: "POST",
      body:   fwd,
      signal: AbortSignal.timeout(60000),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Parser error: ${err}`);
    }

    const data = await res.json();
    return NextResponse.json(data);

  } catch (err) {
    console.error("[bank-parse]", err);
    if (err.message?.includes("fetch") || err.name === "TimeoutError") {
      return NextResponse.json({ error: "ML service offline", offline: true });
    }
    return NextResponse.json({ error: "Parse failed: " + err.message }, { status: 500 });
  }
}
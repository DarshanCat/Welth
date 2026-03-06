import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch("http://127.0.0.1:8000/predict", {
      signal: AbortSignal.timeout(3000), // 3 second timeout
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "ML service returned an error" },
        { status: 200 } // Return 200 so client can handle gracefully
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    // Python service is offline — return a soft error, not a 500
    return NextResponse.json(
      { error: "ML service offline" },
      { status: 200 }
    );
  }
}
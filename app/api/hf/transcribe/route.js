import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

const HF_TOKEN = process.env.HF_TOKEN;
// whisper-large-v3-turbo: fast + accurate + supports Indian English accents
const WHISPER  = "https://api-inference.huggingface.co/models/openai/whisper-large-v3-turbo";

export async function POST(req) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!HF_TOKEN) return NextResponse.json({ error: "HF_TOKEN not configured" }, { status: 500 });

    // Receive raw audio bytes (webm/ogg from browser MediaRecorder)
    const audioBuffer = await req.arrayBuffer();

    if (!audioBuffer || audioBuffer.byteLength < 100) {
      return NextResponse.json({ error: "No audio data received" }, { status: 400 });
    }

    // ── Send to Whisper ────────────────────────────────────────────────────
    const hfRes = await fetch(WHISPER, {
      method:  "POST",
      headers: {
        Authorization:  `Bearer ${HF_TOKEN}`,
        "Content-Type": "audio/webm", // browser MediaRecorder default
      },
      body: audioBuffer,
      signal: AbortSignal.timeout(15000), // 15s timeout
    });

    // Handle model cold start
    if (hfRes.status === 503) {
      const body = await hfRes.json().catch(() => ({}));
      const waitTime = body?.estimated_time || 20;
      return NextResponse.json({
        error:    "Model warming up",
        retry:    true,
        waitTime: Math.ceil(waitTime),
      }, { status: 503 });
    }

    if (!hfRes.ok) {
      const err = await hfRes.text();
      throw new Error(`Whisper error ${hfRes.status}: ${err}`);
    }

    const data = await hfRes.json();
    const text = data?.text?.trim() || "";

    if (!text) {
      return NextResponse.json({ error: "Could not transcribe audio" }, { status: 422 });
    }

    return NextResponse.json({
      text,
      model: "openai/whisper-large-v3-turbo",
    });
  } catch (err) {
    console.error("[hf/transcribe]", err);
    if (err.name === "TimeoutError") {
      return NextResponse.json({ error: "Transcription timed out. Try again." }, { status: 408 });
    }
    return NextResponse.json({ error: "Transcription failed" }, { status: 500 });
  }
}
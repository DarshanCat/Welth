"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemedLogo({ height = 40 }) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Before mount: show original logo (avoids layout shift)
  // After mount:  swap to white version in dark mode
  const src =
    mounted && resolvedTheme === "dark"
      ? "/logo-white.png"   // transparent bg, white ink
      : "/logo.png";        // original (dark ink on white bg)

  return (
    // Plain <img> — avoids Next.js Image optimization cache issues
    // that caused the 500 error with logo-white.png
    <img
      src={src}
      alt="Welth"
      style={{
        height,
        width: "auto",
        objectFit: "contain",
        transition: "opacity 0.2s ease",
      }}
    />
  );
}
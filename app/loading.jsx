import React from "react";
import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex h-[calc(100vh-160px)] w-full items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="relative flex items-center justify-center">
          <div className="absolute h-14 w-14 rounded-full border-t-2 border-primary animate-spin"></div>
          <Loader2 className="h-6 w-6 animate-spin text-primary opacity-70" />
        </div>
        <p className="text-sm text-muted-foreground font-medium animate-pulse tracking-wide">Gathering insights...</p>
      </div>
    </div>
  );
}

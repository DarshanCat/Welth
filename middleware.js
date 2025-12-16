import arcjet, { createMiddleware, detectBot, shield } from "@arcjet/next";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Protect these routes
const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/account(.*)",
  "/transaction(.*)",
]);

// Arcjet middleware
const aj = arcjet({
  key: process.env.ARCJET_KEY!,
  rules: [
    shield({
      mode: "DRY_RUN", // change to "LIVE" in production
    }),
    detectBot({
      mode: "DRY_RUN", // logs only
      allow: [
        "CATEGORY:SEARCH_ENGINE", // Google, Bing, etc.
        "GO_HTTP", // Inngest, webhooks
      ],
    }),
  ],
});

// Clerk middleware
const clerk = clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();

  if (!userId && isProtectedRoute(req)) {
    const { redirectToSignIn } = await auth();
    return redirectToSignIn();
  }

  return NextResponse.next();
});

// Chain middlewares (Arcjet → Clerk)
export default createMiddleware(aj, clerk);

// IMPORTANT: Arcjet requires Node runtime
export const runtime = "nodejs";

// Middleware matcher config
export const config = {
  matcher: [
    // Skip static files & Next internals
    "/((?!_next/static|_next/image|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};

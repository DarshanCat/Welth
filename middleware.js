import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/account(.*)",
  "/transaction(.*)",
]);

// ── Clerk middleware ──────────────────────────────────────────────────────────
const clerk = clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();

  if (!userId && isProtectedRoute(req)) {
    const { redirectToSignIn } = await auth();
    return redirectToSignIn();
  }

  return NextResponse.next();
});

// ── Export ────────────────────────────────────────────────────────────────────
// If ARCJET_KEY is set, wrap with Arcjet; otherwise use Clerk directly.
// This prevents Arcjet from crashing the middleware when the key is absent.
async function middleware(req, event) {
  if (process.env.ARCJET_KEY) {
    try {
      const arcjet = await import("@arcjet/next");
      const aj = arcjet.default({
        key: process.env.ARCJET_KEY,
        rules: [
          arcjet.shield({ mode: "DRY_RUN" }),
          arcjet.detectBot({
            mode: "DRY_RUN",
            allow: ["CATEGORY:SEARCH_ENGINE", "GO_HTTP"],
          }),
        ],
      });
      const ajMiddleware = arcjet.createMiddleware(aj, clerk);
      return ajMiddleware(req, event);
    } catch {
      // Fall through to Clerk only if Arcjet fails
    }
  }
  return clerk(req, event);
}

export default middleware;

export const runtime = "nodejs";

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
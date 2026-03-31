import { NextResponse } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/my-tools(.*)",
  "/settings(.*)",
  "/patients(.*)",
  "/family(.*)",
  "/sessions(.*)",
  "/billing(.*)",
  "/speech-coach(.*)",
]);

const isPublicApiRoute = createRouteMatcher([
  "/api/tool/(.*)",
  "/family/(.*)/play/manifest.json",
]);

export default clerkMiddleware(async (auth, req) => {
  // Public API routes bypass Clerk entirely (shared tool HTML serving)
  if (isPublicApiRoute(req)) return;

  // Server-side redirect: caregivers landing on /dashboard go straight to /family.
  // Avoids the client-side flash where the SLP builder briefly renders.
  const { sessionClaims } = await auth();
  const role = (sessionClaims?.publicMetadata as { role?: string } | undefined)?.role;
  if (role === "caregiver" && req.nextUrl.pathname === "/dashboard") {
    return NextResponse.redirect(new URL("/family", req.url));
  }

  if (isProtectedRoute(req)) await auth.protect();
});

export const config = {
  matcher: [
    "/((?!_next|api/tool/|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api(?!/tool/))(.*)",
    "/(trpc)(.*)",
  ],
};

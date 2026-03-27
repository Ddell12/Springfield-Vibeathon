import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/my-tools(.*)",
  "/settings(.*)",
]);

const isPublicApiRoute = createRouteMatcher([
  "/api/tool/(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  // Public API routes bypass Clerk entirely (shared tool HTML serving)
  if (isPublicApiRoute(req)) return;
  if (isProtectedRoute(req)) await auth.protect();
});

export const config = {
  matcher: [
    "/((?!_next|api/tool/|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api(?!/tool/))(.*)",
    "/(trpc)(.*)",
  ],
};

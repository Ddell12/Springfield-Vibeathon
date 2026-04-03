import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  isAuthenticatedNextjs,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

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
  "/apps/(.*)",
]);

export default convexAuthNextjsMiddleware(
  async (request, { convexAuth }) => {
    if (isPublicApiRoute(request)) return;

    if (
      isProtectedRoute(request) &&
      !(await isAuthenticatedNextjs(convexAuth))
    ) {
      return nextjsMiddlewareRedirect(request, "/sign-in");
    }
  }
);

export const config = {
  matcher: [
    "/((?!_next|api/tool/|apps/|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api(?!/tool/))(.*)",
    "/(trpc)(.*)",
  ],
};

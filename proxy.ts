import { NextResponse, type NextRequest } from "next/server";
import {
  SESSION_COOKIE_NAME,
  verifySessionCookieValue,
} from "@/lib/auth/session";

/**
 * Optimistic navigation guard for protected archive routes.
 *
 * IMPORTANT:
 * `proxy.ts` is NEVER the sole or authoritative authorization boundary.
 * Every protected Server Component, server content loader, and media endpoint
 * independently verifies the session via `lib/auth/dal.ts` (`getSession` /
 * `requireSession`).
 */
export function proxy(request: NextRequest): NextResponse {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  let isAuthenticated = false;
  try {
    isAuthenticated = verifySessionCookieValue(token) !== null;
  } catch {
    // Fail closed if session configuration is missing or malformed.
    isAuthenticated = false;
  }

  if (!isAuthenticated) {
    const redirectResponse = NextResponse.redirect(new URL("/", request.url));
    redirectResponse.headers.set("Cache-Control", "private, no-store, max-age=0");
    return redirectResponse;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/archive", "/archive/:path*", "/artifact", "/artifact/:path*"],
};

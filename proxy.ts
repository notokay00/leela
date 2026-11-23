import { NextResponse, type NextRequest } from "next/server";
import {
  SESSION_COOKIE_NAME,
  verifySessionCookieValue,
} from "@/lib/auth/session";
import { buildCspHeader, generateCspNonce } from "@/lib/security/csp";

const PROTECTED_PREFIXES = ["/archive", "/artifact"] as const;

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

/**
 * Next.js 16 Proxy:
 * 1. Generates a fresh cryptographic per-request CSP nonce and propagates it
 *    to Next.js via `x-nonce` and `Content-Security-Policy` request/response headers.
 * 2. Performs an OPTIMISTIC navigation guard on protected archive routes.
 *
 * IMPORTANT:
 * `proxy.ts` is NEVER the sole or authoritative authorization boundary.
 * Every protected Server Component, server content loader, and media endpoint
 * independently verifies the session via `lib/auth/dal.ts` (`getSession` /
 * `requireSession`).
 */
export function proxy(request: NextRequest): NextResponse {
  const nonce = generateCspNonce();
  const isDev = process.env.NODE_ENV === "development";
  const upgradeInsecureRequests =
    request.nextUrl.protocol === "https:" ||
    (process.env.NODE_ENV === "production" &&
      (process.env.APP_ORIGIN?.startsWith("https://") ?? false));

  const cspHeader = buildCspHeader({
    nonce,
    isDev,
    upgradeInsecureRequests,
  });

  if (isProtectedPath(request.nextUrl.pathname)) {
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
      redirectResponse.headers.set("Content-Security-Policy", cspHeader);
      redirectResponse.headers.set(
        "Cache-Control",
        "private, no-store, max-age=0"
      );
      return redirectResponse;
    }
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", cspHeader);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  response.headers.set("Content-Security-Policy", cspHeader);

  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico|robots.txt).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};

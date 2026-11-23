import { NextResponse } from "next/server";
import { verifySameOrigin } from "@/lib/auth/origin";
import {
  deriveTrustedClientKey,
  devAuthRateLimiter,
} from "@/lib/auth/rate-limit";
import { parseUnlockRequestBody } from "@/lib/auth/request";
import {
  issueSessionCookie,
  verifyConfiguredPassphrase,
} from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIN_FAILURE_DELAY_MS = 250;

const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * POST /api/auth/unlock
 *
 * Verifies the submitted passphrase against the configured OWASP scrypt hash and
 * issues a 24-hour stateless HMAC-SHA256 HttpOnly session cookie.
 *
 * Production deployment note:
 * `devAuthRateLimiter` is an in-memory development-only limiter. Before hosting
 * in production, configure platform WAF rate-limiting rules (e.g., Vercel Firewall)
 * or a shared distributed rate limiter on `/api/auth/unlock`.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const originCheck = verifySameOrigin(request.headers);
  if (!originCheck.ok) {
    return NextResponse.json(
      { error: "Forbidden request origin." },
      { status: 403, headers: NO_STORE_HEADERS }
    );
  }

  const clientKey = deriveTrustedClientKey(request.headers);
  const preCheck = devAuthRateLimiter.check(clientKey);
  if (!preCheck.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait before trying again." },
      {
        status: 429,
        headers: {
          ...NO_STORE_HEADERS,
          "Retry-After": String(preCheck.retryAfterSeconds),
        },
      }
    );
  }

  const parsedBody = await parseUnlockRequestBody(request);
  if (!parsedBody.ok) {
    return NextResponse.json(
      { error: parsedBody.error },
      { status: parsedBody.status, headers: NO_STORE_HEADERS }
    );
  }

  const startedAt = Date.now();
  let isValid = false;
  try {
    isValid = await verifyConfiguredPassphrase(parsedBody.data.passphrase);
  } catch {
    return NextResponse.json(
      { error: "Authentication service is not configured." },
      { status: 503, headers: NO_STORE_HEADERS }
    );
  }

  if (!isValid) {
    const afterFailure = devAuthRateLimiter.recordFailure(clientKey);
    const elapsed = Date.now() - startedAt;
    if (elapsed < MIN_FAILURE_DELAY_MS) {
      await sleep(MIN_FAILURE_DELAY_MS - elapsed);
    }

    if (!afterFailure.allowed) {
      return NextResponse.json(
        { error: "Too many attempts. Please wait before trying again." },
        {
          status: 429,
          headers: {
            ...NO_STORE_HEADERS,
            "Retry-After": String(afterFailure.retryAfterSeconds),
          },
        }
      );
    }

    return NextResponse.json(
      { error: "Invalid passphrase." },
      { status: 401, headers: NO_STORE_HEADERS }
    );
  }

  devAuthRateLimiter.reset(clientKey);
  const session = await issueSessionCookie();

  return NextResponse.json(
    {
      authenticated: true,
      expiresAt: session.expiresAt,
    },
    { status: 200, headers: NO_STORE_HEADERS }
  );
}

import { NextResponse } from "next/server";
import { verifySameOrigin } from "@/lib/auth/origin";
import { validateLockRequestBody } from "@/lib/auth/request";
import { clearSessionCookie } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
};

/**
 * POST /api/auth/lock
 *
 * Clears the browser session cookie.
 * Note: Because sessions are stateless 24-hour HMAC tokens, any previously
 * copied cookie value remains cryptographically valid until its expiration
 * unless ARCHIVE_SESSION_SECRET is rotated.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const originCheck = verifySameOrigin(request.headers);
  if (!originCheck.ok) {
    return NextResponse.json(
      { error: "Forbidden request origin." },
      { status: 403, headers: NO_STORE_HEADERS }
    );
  }

  const bodyCheck = await validateLockRequestBody(request);
  if (!bodyCheck.ok) {
    return NextResponse.json(
      { error: bodyCheck.error },
      { status: bodyCheck.status, headers: NO_STORE_HEADERS }
    );
  }

  await clearSessionCookie();

  return NextResponse.json(
    { authenticated: false },
    { status: 200, headers: NO_STORE_HEADERS }
  );
}

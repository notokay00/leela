import "server-only";
import { cookies } from "next/headers";
import { getAuthConfig, getSessionSecret } from "./config.ts";
import {
  createSessionToken,
  DEFAULT_SESSION_TTL_SECONDS,
  verifyPassphrase,
  verifySessionToken,
  type SessionPayload,
} from "./crypto.ts";

export const SESSION_COOKIE_NAME = "archive_session";

/**
 * Verifies a submitted passphrase against the configured scrypt hash.
 * Never logs or exposes the plaintext passphrase.
 */
export async function verifyConfiguredPassphrase(
  passphrase: string
): Promise<boolean> {
  const { passphraseHash } = getAuthConfig();
  return verifyPassphrase(passphrase, passphraseHash);
}

/**
 * Verifies a raw session cookie value using the configured HMAC secret.
 * Returns null cleanly if missing, malformed, expired, or secret is invalid.
 */
export function verifySessionCookieValue(
  token: string | undefined,
  nowSeconds?: number
): SessionPayload | null {
  if (!token) {
    return null;
  }

  const secret = getSessionSecret();
  return verifySessionToken(token, secret, nowSeconds);
}

/**
 * Issues a new 24-hour stateless HMAC-signed HttpOnly session cookie.
 * Rotating ARCHIVE_SESSION_SECRET invalidates all active tokens immediately.
 */
export async function issueSessionCookie(): Promise<SessionPayload> {
  const secret = getSessionSecret();
  const { token, session } = createSessionToken(secret, {
    ttlSeconds: DEFAULT_SESSION_TTL_SECONDS,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DEFAULT_SESSION_TTL_SECONDS,
    expires: new Date(session.expiresAt * 1000),
  });

  return session;
}

/**
 * Clears the session cookie from the browser.
 * Note: Because sessions are stateless HMAC tokens with no database, any copied
 * token remains valid until its 24-hour expiration unless ARCHIVE_SESSION_SECRET
 * is rotated.
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });
}

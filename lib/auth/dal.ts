import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE_NAME, verifySessionCookieValue } from "./session.ts";
import type { SessionPayload } from "./crypto.ts";

/**
 * Authoritative server-side session lookup (memoized per React render pass).
 * Every protected Server Component, content loader, and media endpoint must
 * rely on this Data Access Layer rather than proxy.ts alone.
 */
export const getSession = cache(async (): Promise<SessionPayload | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return verifySessionCookieValue(token);
});

/**
 * Authoritative guard for protected Server Components and server data loaders.
 * Redirects unauthenticated requests to the Threshold route ("/").
 */
export const requireSession = cache(async (): Promise<SessionPayload> => {
  const session = await getSession();
  if (!session) {
    redirect("/");
  }
  return session;
});

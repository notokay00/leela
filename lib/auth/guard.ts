import "server-only";
import type { SessionPayload } from "./crypto.ts";

/**
 * Authoritative session assertion helper invoked by the Data Access Layer
 * (`requireSession`) independently of `proxy.ts`.
 */
export function enforceSessionToken(
  token: string | undefined,
  verifyFn: (value: string | undefined) => SessionPayload | null,
  onUnauthorized: () => never
): SessionPayload {
  const session = verifyFn(token);
  if (!session) {
    return onUnauthorized();
  }
  return session;
}

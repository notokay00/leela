import "server-only";

export interface OriginValidationResult {
  ok: boolean;
  origin?: string;
  reason?: string;
}

function normalizeOrigin(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "null") {
    return null;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    // Reject values that include paths, query strings, or fragments.
    if (parsed.origin !== trimmed) {
      return null;
    }
    return parsed.origin;
  } catch {
    return null;
  }
}

/**
 * Resolves the explicit set of trusted application origins from server
 * configuration ONLY. Never reads arbitrary Host, X-Forwarded-Host, or
 * client-supplied forwarding headers.
 */
export function getTrustedOrigins(
  env: Record<string, string | undefined> = process.env
): Set<string> {
  const origins = new Set<string>();

  if (env.APP_ORIGIN) {
    for (const candidate of env.APP_ORIGIN.split(",")) {
      const normalized = normalizeOrigin(candidate);
      if (normalized) {
        origins.add(normalized);
      }
    }
  }

  // Platform-provided deployment hostname on Vercel (not client-supplied).
  if (env.VERCEL === "1" && env.VERCEL_URL) {
    const normalized = normalizeOrigin(`https://${env.VERCEL_URL.trim()}`);
    if (normalized) {
      origins.add(normalized);
    }
  }

  // On Vercel Preview deployments only, also trust the platform-provided branch alias hostname.
  if (
    env.VERCEL === "1" &&
    env.VERCEL_ENV === "preview" &&
    env.VERCEL_BRANCH_URL
  ) {
    const normalized = normalizeOrigin(
      `https://${env.VERCEL_BRANCH_URL.trim()}`
    );
    if (normalized) {
      origins.add(normalized);
    }
  }

  // In non-production local dev only, default to localhost:3000 if APP_ORIGIN is unset.
  if (origins.size === 0 && env.NODE_ENV !== "production") {
    origins.add("http://localhost:3000");
    origins.add("http://127.0.0.1:3000");
  }

  return origins;
}

/**
 * Enforces strict same-origin validation using the browser Origin header against
 * server-configured trusted origins. Fails closed when Origin is missing, "null",
 * malformed, or not in the trusted origin allowlist.
 */
export function verifySameOrigin(
  headers: Pick<Headers, "get">,
  env: Record<string, string | undefined> = process.env
): OriginValidationResult {
  const trustedOrigins = getTrustedOrigins(env);
  if (trustedOrigins.size === 0) {
    return {
      ok: false,
      reason: "No trusted APP_ORIGIN configured on server.",
    };
  }

  const originHeader = headers.get("origin");
  if (!originHeader) {
    return { ok: false, reason: "Missing Origin header." };
  }

  const normalizedOrigin = normalizeOrigin(originHeader);
  if (!normalizedOrigin) {
    return { ok: false, reason: "Invalid Origin header." };
  }

  if (!trustedOrigins.has(normalizedOrigin)) {
    return { ok: false, reason: "Cross-origin request rejected." };
  }

  return { ok: true, origin: normalizedOrigin };
}

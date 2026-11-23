import "server-only";
import { randomBytes } from "node:crypto";

export interface BuildCspOptions {
  nonce: string;
  isDev?: boolean;
  upgradeInsecureRequests?: boolean;
}

/**
 * Generates an unpredictable 128-bit cryptographically secure base64 nonce
 * for a single HTTP request.
 */
export function generateCspNonce(): string {
  return randomBytes(16).toString("base64");
}

/**
 * Builds a strict nonce-based Content-Security-Policy compatible with Next.js 16.
 *
 * - Production removes `unsafe-inline` from both `script-src` and `style-src`
 *   and never permits `unsafe-eval`.
 * - Development adds `unsafe-eval` ONLY when `isDev === true` for React's
 *   development error stack reconstruction.
 * - `upgrade-insecure-requests` is enabled only for HTTPS deployments so local
 *   HTTP production verification (`http://localhost`) continues to load cleanly.
 */
export function buildCspHeader({
  nonce,
  isDev = false,
  upgradeInsecureRequests = false,
}: BuildCspOptions): string {
  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    ...(isDev ? ["'unsafe-eval'"] : []),
  ].join(" ");

  const styleSrc = ["'self'", `'nonce-${nonce}'`].join(" ");

  const directives = [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    `style-src ${styleSrc}`,
    "img-src 'self' blob: data:",
    "media-src 'self' blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];

  if (upgradeInsecureRequests) {
    directives.push("upgrade-insecure-requests");
  }

  return directives.join("; ");
}

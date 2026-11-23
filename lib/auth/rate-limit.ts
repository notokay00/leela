import "server-only";
import { createHmac, randomBytes } from "node:crypto";

export interface RateLimitCheckResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
  reason?: "client-limit" | "global-limit";
}

export interface RateLimiter {
  check(clientKey: string, nowMs?: number): RateLimitCheckResult;
  recordFailure(clientKey: string, nowMs?: number): RateLimitCheckResult;
  reset(clientKey: string): void;
}

export interface InMemoryRateLimiterOptions {
  maxAttemptsPerClient?: number;
  clientWindowMs?: number;
  maxGlobalAttempts?: number;
  globalWindowMs?: number;
  maxTrackedClients?: number;
}

const DEFAULT_MAX_ATTEMPTS_PER_CLIENT = 5;
const DEFAULT_CLIENT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const DEFAULT_MAX_GLOBAL_ATTEMPTS = 20;
const DEFAULT_GLOBAL_WINDOW_MS = 60 * 60 * 1000; // 60 minutes
const DEFAULT_MAX_TRACKED_CLIENTS = 500;

/**
 * DEVELOPMENT-ONLY in-memory sliding-window rate limiter.
 *
 * IMPORTANT:
 * - State lives strictly in process memory and resets on restart or across
 *   serverless instances. Production deployments MUST configure platform/edge
 *   rate limiting (e.g., Vercel Firewall WAF rules) or a distributed store
 *   before going live.
 * - Client identifiers are keyed via a per-process random HMAC so raw visitor
 *   IP addresses are never stored, persisted, or logged.
 */
export class InMemoryRateLimiter implements RateLimiter {
  private readonly maxAttemptsPerClient: number;
  private readonly clientWindowMs: number;
  private readonly maxGlobalAttempts: number;
  private readonly globalWindowMs: number;
  private readonly maxTrackedClients: number;
  private readonly keySalt: Buffer;
  private readonly clientAttempts = new Map<string, number[]>();
  private globalAttempts: number[] = [];

  constructor(options?: InMemoryRateLimiterOptions) {
    this.maxAttemptsPerClient =
      options?.maxAttemptsPerClient ?? DEFAULT_MAX_ATTEMPTS_PER_CLIENT;
    this.clientWindowMs = options?.clientWindowMs ?? DEFAULT_CLIENT_WINDOW_MS;
    this.maxGlobalAttempts =
      options?.maxGlobalAttempts ?? DEFAULT_MAX_GLOBAL_ATTEMPTS;
    this.globalWindowMs = options?.globalWindowMs ?? DEFAULT_GLOBAL_WINDOW_MS;
    this.maxTrackedClients =
      options?.maxTrackedClients ?? DEFAULT_MAX_TRACKED_CLIENTS;
    this.keySalt = randomBytes(32);
  }

  private hashKey(clientKey: string): string {
    return createHmac("sha256", this.keySalt).update(clientKey).digest("hex");
  }

  private pruneWindow(timestamps: number[], windowMs: number, nowMs: number): number[] {
    const cutoff = nowMs - windowMs;
    return timestamps.filter((ts) => ts > cutoff);
  }

  private pruneAll(nowMs: number): void {
    this.globalAttempts = this.pruneWindow(
      this.globalAttempts,
      this.globalWindowMs,
      nowMs
    );

    for (const [hashedKey, timestamps] of this.clientAttempts.entries()) {
      const pruned = this.pruneWindow(timestamps, this.clientWindowMs, nowMs);
      if (pruned.length === 0) {
        this.clientAttempts.delete(hashedKey);
      } else {
        this.clientAttempts.set(hashedKey, pruned);
      }
    }
  }

  check(clientKey: string, nowMs: number = Date.now()): RateLimitCheckResult {
    this.pruneAll(nowMs);

    if (this.globalAttempts.length >= this.maxGlobalAttempts) {
      const oldestGlobal = this.globalAttempts[0];
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((oldestGlobal + this.globalWindowMs - nowMs) / 1000)
      );
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds,
        reason: "global-limit",
      };
    }

    const hashedKey = this.hashKey(clientKey);
    const attempts = this.clientAttempts.get(hashedKey) ?? [];

    if (attempts.length >= this.maxAttemptsPerClient) {
      const oldestClient = attempts[0];
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((oldestClient + this.clientWindowMs - nowMs) / 1000)
      );
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds,
        reason: "client-limit",
      };
    }

    return {
      allowed: true,
      remaining: Math.max(0, this.maxAttemptsPerClient - attempts.length),
      retryAfterSeconds: 0,
    };
  }

  recordFailure(
    clientKey: string,
    nowMs: number = Date.now()
  ): RateLimitCheckResult {
    this.pruneAll(nowMs);

    const hashedKey = this.hashKey(clientKey);
    if (
      !this.clientAttempts.has(hashedKey) &&
      this.clientAttempts.size >= this.maxTrackedClients
    ) {
      const firstKey = this.clientAttempts.keys().next().value;
      if (firstKey !== undefined) {
        this.clientAttempts.delete(firstKey);
      }
    }

    const updatedClient = [...(this.clientAttempts.get(hashedKey) ?? []), nowMs];
    this.clientAttempts.set(hashedKey, updatedClient);
    this.globalAttempts.push(nowMs);

    return this.check(clientKey, nowMs);
  }

  reset(clientKey: string): void {
    this.clientAttempts.delete(this.hashKey(clientKey));
  }
}

/**
 * Extracts a client rate-limit key using ONLY trusted platform-provided headers.
 * Arbitrary client-supplied X-Forwarded-For / X-Real-IP headers are intentionally
 * ignored to prevent rate-limit spoofing.
 */
export function deriveTrustedClientKey(
  headers: Pick<Headers, "get">,
  env: Record<string, string | undefined> = process.env
): string {
  if (env.VERCEL === "1") {
    const vercelIp = headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim();
    if (vercelIp) {
      return `vercel:${vercelIp}`;
    }
  }

  if (env.TRUSTED_PROXY_PROVIDER === "cloudflare") {
    const cfIp = headers.get("cf-connecting-ip")?.trim();
    if (cfIp) {
      return `cf:${cfIp}`;
    }
  }

  return "local-dev";
}

export const devAuthRateLimiter = new InMemoryRateLimiter();

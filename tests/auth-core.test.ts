import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { describe, it } from "node:test";
import {
  createSessionToken,
  DEFAULT_SESSION_TTL_SECONDS,
  hashPassphrase,
  MAX_CLOCK_SKEW_SECONDS,
  parsePassphraseHash,
  verifyPassphrase,
  verifySessionToken,
} from "../lib/auth/crypto.ts";
import { getAuthConfig, getSessionSecret } from "../lib/auth/config.ts";
import {
  deriveTrustedClientKey,
  InMemoryRateLimiter,
} from "../lib/auth/rate-limit.ts";

describe("Passphrase hashing and verification (async scrypt)", () => {
  it("hashes and verifies an ephemeral passphrase with timing-safe comparison", async () => {
    const ephemeral = randomBytes(18).toString("base64url");
    const encoded = await hashPassphrase(ephemeral);

    assert.match(encoded, /^scrypt:16384:8:1:[0-9a-f]{32}:[0-9a-f]{128}$/);
    assert.equal(await verifyPassphrase(ephemeral, encoded), true);
    assert.equal(await verifyPassphrase(`${ephemeral}-wrong`, encoded), false);
    assert.equal(await verifyPassphrase("", encoded), false);
    assert.equal(await verifyPassphrase("a".repeat(300), encoded), false);
  });

  it("rejects tampered hashes and weak scrypt parameters", async () => {
    const ephemeral = randomBytes(16).toString("base64url");
    const encoded = await hashPassphrase(ephemeral);
    const parts = encoded.split(":");

    // Flip last hex char of derived key
    const lastChar = parts[5].endsWith("0") ? "1" : "0";
    const tamperedKey = `${parts.slice(0, 5).join(":")}:${parts[5].slice(0, -1)}${lastChar}`;
    assert.equal(await verifyPassphrase(ephemeral, tamperedKey), false);

    // Weak N parameter (< 16384)
    const weakN = `scrypt:1024:8:1:${parts[4]}:${parts[5]}`;
    assert.equal(parsePassphraseHash(weakN), null);
    assert.equal(await verifyPassphrase(ephemeral, weakN), false);
  });
});

describe("Stateless HMAC-SHA256 session tokens (24h TTL)", () => {
  const secretA = randomBytes(32);
  const secretB = randomBytes(32);
  const baseTime = 1_800_000_000;

  it("issues a 24-hour v1 token with unique CSPRNG nonces and verifies it", () => {
    assert.equal(DEFAULT_SESSION_TTL_SECONDS, 86_400);

    const first = createSessionToken(secretA, { nowSeconds: baseTime });
    const second = createSessionToken(secretA, { nowSeconds: baseTime });

    assert.notEqual(first.session.nonce, second.session.nonce);
    assert.equal(first.session.expiresAt - first.session.issuedAt, 86_400);
    assert.equal(first.token.split(".").length, 5);

    const verified = verifySessionToken(first.token, secretA, baseTime + 10);
    assert.deepEqual(verified, first.session);
  });

  it("invalidates existing tokens when ARCHIVE_SESSION_SECRET is rotated", () => {
    const { token } = createSessionToken(secretA, { nowSeconds: baseTime });
    assert.equal(verifySessionToken(token, secretB, baseTime + 10), null);
  });

  it("rejects expired, tampered, wrong-version, future, and excessive-TTL tokens", () => {
    const { token } = createSessionToken(secretA, { nowSeconds: baseTime });
    const parts = token.split(".");

    // Expired at exact expiresAt boundary
    assert.equal(verifySessionToken(token, secretA, baseTime + 86_400), null);

    // Issued too far in the future beyond clock skew
    assert.equal(
      verifySessionToken(
        token,
        secretA,
        baseTime - MAX_CLOCK_SKEW_SECONDS - 1
      ),
      null
    );

    // Wrong version
    const wrongVersion = ["v2", ...parts.slice(1)].join(".");
    assert.equal(verifySessionToken(wrongVersion, secretA, baseTime + 5), null);

    // Tampered expiresAt
    const tamperedExpiry = [
      parts[0],
      parts[1],
      String(baseTime + 86_401),
      parts[3],
      parts[4],
    ].join(".");
    assert.equal(verifySessionToken(tamperedExpiry, secretA, baseTime + 5), null);

    // Tampered signature
    const badSigChar = parts[4].startsWith("A") ? "B" : "A";
    const tamperedSig = [
      ...parts.slice(0, 4),
      `${badSigChar}${parts[4].slice(1)}`,
    ].join(".");
    assert.equal(verifySessionToken(tamperedSig, secretA, baseTime + 5), null);

    // Malformed structure
    assert.equal(verifySessionToken("not-a-valid-token", secretA, baseTime), null);
    assert.equal(verifySessionToken("", secretA, baseTime), null);

    // Excessive TTL rejected at creation time
    assert.throws(() =>
      createSessionToken(secretA, {
        nowSeconds: baseTime,
        ttlSeconds: 86_401,
      })
    );
  });
});

describe("Auth config fail-closed behavior", () => {
  it("validates configured .env.local secrets when loaded", () => {
    if (process.env.ARCHIVE_PASSPHRASE_HASH && process.env.ARCHIVE_SESSION_SECRET) {
      const config = getAuthConfig();
      assert.ok(config.sessionSecret.length >= 32);
      assert.ok(parsePassphraseHash(config.passphraseHash) !== null);
    }
  });

  it("fails closed when required secrets are missing or too short", () => {
    const prevHash = process.env.ARCHIVE_PASSPHRASE_HASH;
    const prevSecret = process.env.ARCHIVE_SESSION_SECRET;
    try {
      delete process.env.ARCHIVE_PASSPHRASE_HASH;
      delete process.env.ARCHIVE_SESSION_SECRET;

      assert.throws(() => getSessionSecret());
      assert.throws(() => getAuthConfig());

      process.env.ARCHIVE_SESSION_SECRET = "too-short";
      assert.throws(() => getSessionSecret());
    } finally {
      if (prevHash === undefined) {
        delete process.env.ARCHIVE_PASSPHRASE_HASH;
      } else {
        process.env.ARCHIVE_PASSPHRASE_HASH = prevHash;
      }
      if (prevSecret === undefined) {
        delete process.env.ARCHIVE_SESSION_SECRET;
      } else {
        process.env.ARCHIVE_SESSION_SECRET = prevSecret;
      }
    }
  });
});

describe("Development in-memory rate limiter and trusted client key derivation", () => {
  it("enforces per-client sliding window, reset, and window expiry", () => {
    const limiter = new InMemoryRateLimiter({
      maxAttemptsPerClient: 5,
      clientWindowMs: 60_000,
      maxGlobalAttempts: 20,
      globalWindowMs: 300_000,
    });
    const t0 = 1_000_000;

    for (let i = 0; i < 4; i++) {
      const res = limiter.recordFailure("client-a", t0 + i * 1_000);
      assert.equal(res.allowed, true);
    }

    const fifth = limiter.recordFailure("client-a", t0 + 4_000);
    assert.equal(fifth.allowed, false);
    assert.equal(fifth.reason, "client-limit");
    assert.ok(fifth.retryAfterSeconds > 0);

    // Blocked on check before window expires
    assert.equal(limiter.check("client-a", t0 + 10_000).allowed, false);

    // Allowed again after window expires
    assert.equal(limiter.check("client-a", t0 + 65_000).allowed, true);

    // Explicit reset clears client attempts immediately
    limiter.recordFailure("client-b", t0);
    limiter.recordFailure("client-b", t0 + 1);
    limiter.reset("client-b");
    assert.equal(limiter.check("client-b", t0 + 2).remaining, 5);
  });

  it("enforces global brute-force circuit breaker across distinct keys", () => {
    const limiter = new InMemoryRateLimiter({
      maxAttemptsPerClient: 5,
      clientWindowMs: 60_000,
      maxGlobalAttempts: 6,
      globalWindowMs: 120_000,
    });
    const t0 = 2_000_000;

    for (let i = 0; i < 6; i++) {
      limiter.recordFailure(`distinct-client-${i}`, t0 + i * 100);
    }

    const blocked = limiter.check("brand-new-client", t0 + 1_000);
    assert.equal(blocked.allowed, false);
    assert.equal(blocked.reason, "global-limit");
    assert.ok(blocked.retryAfterSeconds > 0);
  });

  it("ignores arbitrary client-supplied X-Forwarded-For headers", () => {
    const spoofedHeaders = new Headers({
      "x-forwarded-for": "203.0.113.99, 10.0.0.1",
      "x-real-ip": "203.0.113.99",
    });

    assert.equal(deriveTrustedClientKey(spoofedHeaders, {}), "local-dev");

    const vercelHeaders = new Headers({
      "x-forwarded-for": "203.0.113.99",
      "x-vercel-forwarded-for": "198.51.100.42",
    });
    assert.equal(
      deriveTrustedClientKey(vercelHeaders, { VERCEL: "1" }),
      "vercel:198.51.100.42"
    );
  });
});

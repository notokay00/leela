import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { describe, it } from "node:test";
import {
  createSessionToken,
  verifySessionToken,
} from "../lib/auth/crypto.ts";
import { enforceSessionToken } from "../lib/auth/guard.ts";
import { getTrustedOrigins, verifySameOrigin } from "../lib/auth/origin.ts";
import {
  MAX_UNLOCK_BODY_BYTES,
  parseUnlockRequestBody,
  validateLockRequestBody,
} from "../lib/auth/request.ts";

describe("Trusted origin and same-origin POST validation", () => {
  it("accepts configured APP_ORIGIN and rejects missing, null, or cross-origin headers", () => {
    const prodEnv = {
      NODE_ENV: "production",
      APP_ORIGIN: "https://archive.example.com",
    };

    assert.equal(
      verifySameOrigin(
        new Headers({ origin: "https://archive.example.com" }),
        prodEnv
      ).ok,
      true
    );

    assert.equal(verifySameOrigin(new Headers({}), prodEnv).ok, false);
    assert.equal(
      verifySameOrigin(new Headers({ origin: "null" }), prodEnv).ok,
      false
    );
    assert.equal(
      verifySameOrigin(
        new Headers({ origin: "https://evil.example" }),
        prodEnv
      ).ok,
      false
    );
    assert.equal(
      verifySameOrigin(
        new Headers({ origin: "http://archive.example.com" }),
        prodEnv
      ).ok,
      false
    );
  });

  it("ignores arbitrary Host and X-Forwarded-Host headers and fails closed in production without APP_ORIGIN", () => {
    const unconfiguredProd = { NODE_ENV: "production" };
    assert.equal(getTrustedOrigins(unconfiguredProd).size, 0);

    const spoofedHeaders = new Headers({
      origin: "https://attacker.example",
      host: "attacker.example",
      "x-forwarded-host": "attacker.example",
      "x-forwarded-proto": "https",
    });

    assert.equal(verifySameOrigin(spoofedHeaders, unconfiguredProd).ok, false);
  });

  it("rejects malformed APP_ORIGIN entries containing paths or wildcards", () => {
    const origins = getTrustedOrigins({
      NODE_ENV: "production",
      APP_ORIGIN: "https://archive.example.com/path, *, https://valid.example",
    });
    assert.deepEqual([...origins], ["https://valid.example"]);
  });

  it("trusts platform-provided VERCEL_BRANCH_URL strictly on Vercel Preview deployments", () => {
    const previewEnv = {
      NODE_ENV: "production",
      VERCEL: "1",
      VERCEL_ENV: "preview",
      VERCEL_URL: "app-abc123-team.vercel.app",
      VERCEL_BRANCH_URL: "app-git-archive-redesign-team.vercel.app",
    };
    assert.equal(
      verifySameOrigin(
        new Headers({ origin: "https://app-abc123-team.vercel.app" }),
        previewEnv
      ).ok,
      true
    );
    assert.equal(
      verifySameOrigin(
        new Headers({
          origin: "https://app-git-archive-redesign-team.vercel.app",
        }),
        previewEnv
      ).ok,
      true
    );

    const prodEnv = {
      NODE_ENV: "production",
      VERCEL: "1",
      VERCEL_ENV: "production",
      APP_ORIGIN: "https://app.vercel.app",
      VERCEL_BRANCH_URL: "app-git-archive-redesign-team.vercel.app",
    };
    assert.equal(
      verifySameOrigin(
        new Headers({
          origin: "https://app-git-archive-redesign-team.vercel.app",
        }),
        prodEnv
      ).ok,
      false
    );
  });
});

describe("Strict request-body schema and size validation", () => {
  it("validates well-formed unlock JSON and rejects missing, malformed, unexpected, non-JSON, or oversized bodies", async () => {
    const validReq = new Request("http://localhost:3000/api/auth/unlock", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ passphrase: "sample-ephemeral-value" }),
    });
    const validRes = await parseUnlockRequestBody(validReq);
    assert.equal(validRes.ok, true);

    // Non-JSON content-type -> 415
    const wrongType = await parseUnlockRequestBody(
      new Request("http://localhost:3000/api/auth/unlock", {
        method: "POST",
        headers: { "content-type": "text/plain" },
        body: JSON.stringify({ passphrase: "x" }),
      })
    );
    assert.equal(wrongType.ok, false);
    if (!wrongType.ok) assert.equal(wrongType.status, 415);

    // Empty body -> 400
    const emptyBody = await parseUnlockRequestBody(
      new Request("http://localhost:3000/api/auth/unlock", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "",
      })
    );
    assert.equal(emptyBody.ok, false);
    if (!emptyBody.ok) assert.equal(emptyBody.status, 400);

    // Malformed JSON -> 400
    const malformed = await parseUnlockRequestBody(
      new Request("http://localhost:3000/api/auth/unlock", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{bad-json",
      })
    );
    assert.equal(malformed.ok, false);
    if (!malformed.ok) assert.equal(malformed.status, 400);

    // Unexpected extra field -> 400
    const extraField = await parseUnlockRequestBody(
      new Request("http://localhost:3000/api/auth/unlock", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ passphrase: "x", role: "admin" }),
      })
    );
    assert.equal(extraField.ok, false);
    if (!extraField.ok) assert.equal(extraField.status, 400);

    // Oversized body (> MAX_UNLOCK_BODY_BYTES) -> 413
    const oversized = await parseUnlockRequestBody(
      new Request("http://localhost:3000/api/auth/unlock", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          passphrase: "a".repeat(MAX_UNLOCK_BODY_BYTES + 64),
        }),
      })
    );
    assert.equal(oversized.ok, false);
    if (!oversized.ok) assert.equal(oversized.status, 413);
  });

  it("validates lock request bodies strictly", async () => {
    const emptyLock = await validateLockRequestBody(
      new Request("http://localhost:3000/api/auth/lock", { method: "POST" })
    );
    assert.equal(emptyLock.ok, true);

    const emptyObjLock = await validateLockRequestBody(
      new Request("http://localhost:3000/api/auth/lock", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      })
    );
    assert.equal(emptyObjLock.ok, true);

    const unexpectedLock = await validateLockRequestBody(
      new Request("http://localhost:3000/api/auth/lock", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ unexpected: true }),
      })
    );
    assert.equal(unexpectedLock.ok, false);
    if (!unexpectedLock.ok) assert.equal(unexpectedLock.status, 400);
  });
});

describe("Independent DAL session authorization (without proxy.ts)", () => {
  it("enforces authorization directly via enforceSessionToken on missing, tampered, rotated, and expired tokens", () => {
    const secret = randomBytes(32);
    const rotatedSecret = randomBytes(32);
    const now = 1_800_000_000;
    const { token, session } = createSessionToken(secret, { nowSeconds: now });

    const verifyAt =
      (checkNow: number, activeSecret: Buffer = secret) =>
      (value: string | undefined) =>
        value ? verifySessionToken(value, activeSecret, checkNow) : null;

    const triggerRedirect = (): never => {
      throw new Error("NEXT_REDIRECT:/");
    };

    // Valid token passes independent DAL check
    assert.deepEqual(
      enforceSessionToken(token, verifyAt(now + 60), triggerRedirect),
      session
    );

    // Missing cookie triggers DAL redirect even if proxy.ts allowed navigation
    assert.throws(
      () => enforceSessionToken(undefined, verifyAt(now + 60), triggerRedirect),
      /NEXT_REDIRECT:\//
    );

    // Malformed / tampered cookie triggers DAL redirect
    assert.throws(
      () =>
        enforceSessionToken(
          "v1.bad.token.here.sig",
          verifyAt(now + 60),
          triggerRedirect
        ),
      /NEXT_REDIRECT:\//
    );

    // Expired token triggers DAL redirect
    assert.throws(
      () =>
        enforceSessionToken(token, verifyAt(now + 86_400), triggerRedirect),
      /NEXT_REDIRECT:\//
    );

    // Secret rotation triggers DAL redirect
    assert.throws(
      () =>
        enforceSessionToken(
          token,
          verifyAt(now + 60, rotatedSecret),
          triggerRedirect
        ),
      /NEXT_REDIRECT:\//
    );
  });
});

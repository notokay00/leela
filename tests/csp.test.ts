import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildCspHeader, generateCspNonce } from "../lib/security/csp.ts";

describe("Nonce-based Content-Security-Policy builder", () => {
  it("generates unique, unpredictable 128-bit base64 nonces per call", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const nonce = generateCspNonce();
      assert.equal(Buffer.from(nonce, "base64").length, 16);
      assert.equal(seen.has(nonce), false);
      seen.add(nonce);
    }
  });

  it("excludes unsafe-inline and unsafe-eval in production", () => {
    const nonce = generateCspNonce();
    const csp = buildCspHeader({ nonce, isDev: false });

    assert.ok(csp.includes(`script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`));
    assert.ok(csp.includes(`style-src 'self' 'nonce-${nonce}'`));
    assert.equal(csp.includes("unsafe-inline"), false);
    assert.equal(csp.includes("unsafe-eval"), false);
    assert.ok(csp.includes("object-src 'none'"));
    assert.ok(csp.includes("frame-ancestors 'none'"));
    assert.equal(csp.includes("upgrade-insecure-requests"), false);
  });

  it("isolates unsafe-eval strictly to development and adds upgrade-insecure-requests only for HTTPS", () => {
    const nonce = generateCspNonce();
    const devCsp = buildCspHeader({ nonce, isDev: true });
    assert.ok(devCsp.includes("'unsafe-eval'"));
    assert.equal(devCsp.includes("unsafe-inline"), false);

    const httpsProdCsp = buildCspHeader({
      nonce,
      isDev: false,
      upgradeInsecureRequests: true,
    });
    assert.ok(httpsProdCsp.includes("upgrade-insecure-requests"));
    assert.equal(httpsProdCsp.includes("unsafe-eval"), false);
    assert.equal(httpsProdCsp.includes("unsafe-inline"), false);
  });
});

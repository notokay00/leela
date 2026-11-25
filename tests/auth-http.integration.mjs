import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes, scrypt } from "node:crypto";
import path from "node:path";

const PORT = 3098;
const ORIGIN = `http://localhost:${PORT}`;

function scryptHash(passphrase) {
  return new Promise((resolve, reject) => {
    const salt = randomBytes(16);
    scrypt(
      passphrase,
      salt,
      64,
      { N: 65536, r: 8, p: 2, maxmem: 128 * 1024 * 1024 },
      (err, key) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(
          `scrypt:65536:8:2:${salt.toString("hex")}:${key.toString("hex")}`
        );
      }
    );
  });
}

async function waitForServer(url, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.status === 200) return;
    } catch {
      // retry until ready
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Timed out waiting for server at ${url}`);
}

async function run() {
  // Ephemeral passphrase exists only in memory inside this test process.
  const ephemeralPassphrase = randomBytes(20).toString("base64url");
  const passphraseHash = await scryptHash(ephemeralPassphrase);
  const sessionSecret = randomBytes(32).toString("hex");

  const nextBin = path.resolve(
    process.cwd(),
    "node_modules",
    "next",
    "dist",
    "bin",
    "next"
  );

  const server = spawn(process.execPath, [nextBin, "start", "-p", String(PORT)], {
    env: {
      ...process.env,
      NODE_ENV: "production",
      APP_ORIGIN: ORIGIN,
      ARCHIVE_PASSPHRASE_HASH: passphraseHash,
      ARCHIVE_SESSION_SECRET: sessionSecret,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stderrBuf = "";
  server.stderr.on("data", (chunk) => {
    stderrBuf += chunk.toString();
  });

  try {
    await waitForServer(`${ORIGIN}/`).catch((err) => {
      throw new Error(`${err.message}\nServer stderr:\n${stderrBuf}`);
    });

    // 1. Fresh per-request nonce-based CSP & security headers on /
    const homeRes = await fetch(`${ORIGIN}/`);
    assert.equal(homeRes.status, 200);
    const csp = homeRes.headers.get("content-security-policy") ?? "";
    const nonceMatch1 = csp.match(/'nonce-([A-Za-z0-9+/=]+)'/);
    assert.ok(nonceMatch1, "Missing nonce in CSP header");
    assert.ok(csp.includes("default-src 'self'"), "Missing default-src in CSP");
    assert.ok(csp.includes("'strict-dynamic'"), "Missing strict-dynamic in CSP");
    assert.ok(csp.includes("frame-ancestors 'none'"), "Missing frame-ancestors in CSP");
    assert.ok(!csp.includes("unsafe-inline"), "Production CSP must not allow unsafe-inline");
    assert.ok(!csp.includes("unsafe-eval"), "Production CSP must not allow unsafe-eval");

    const homeHtml = await homeRes.text();
    assert.ok(
      homeHtml.includes(`nonce="${nonceMatch1[1]}"`),
      "Rendered HTML must propagate the exact per-request CSP nonce to Next.js scripts"
    );
    assert.ok(
      homeHtml.includes('type="password"'),
      "Unauthenticated Threshold must render initial passphrase field"
    );
    assert.ok(
      homeHtml.includes('for="archive-passphrase"') &&
        homeHtml.includes("Passphrase</label>"),
      "Unauthenticated Threshold must include accessible visually hidden label for passphrase input"
    );
    assert.ok(
      !homeHtml.includes("with sound"),
      "Unauthenticated Threshold must not reveal accepted entry choices"
    );

    // Second request must receive a fresh, distinct nonce (no stale nonce reuse)
    const homeRes2 = await fetch(`${ORIGIN}/`);
    const csp2 = homeRes2.headers.get("content-security-policy") ?? "";
    const nonceMatch2 = csp2.match(/'nonce-([A-Za-z0-9+/=]+)'/);
    assert.ok(nonceMatch2, "Missing nonce on second request");
    assert.notEqual(nonceMatch1[1], nonceMatch2[1], "CSP nonce must be fresh per request");

    assert.equal(
      homeRes.headers.get("x-robots-tag"),
      "noindex, nofollow, noarchive, noimageindex"
    );
    assert.equal(homeRes.headers.get("referrer-policy"), "no-referrer");
    assert.equal(homeRes.headers.get("x-content-type-options"), "nosniff");
    assert.equal(homeRes.headers.get("x-frame-options"), "DENY");

    // 2. Unauthenticated & tampered GET /archive -> 307 redirect to /
    const unauthArchive = await fetch(`${ORIGIN}/archive`, {
      redirect: "manual",
    });
    assert.equal(unauthArchive.status, 307);
    assert.equal(new URL(unauthArchive.headers.get("location") ?? "", ORIGIN).pathname, "/");

    const tamperedArchive = await fetch(`${ORIGIN}/archive`, {
      redirect: "manual",
      headers: { cookie: "archive_session=v1.1800000000.1800086400.badnonce.badsig" },
    });
    assert.equal(tamperedArchive.status, 307);

    // 3. Missing & cross-origin Origin headers rejected (403)
    const missingOrigin = await fetch(`${ORIGIN}/api/auth/unlock`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ passphrase: ephemeralPassphrase }),
    });
    assert.equal(missingOrigin.status, 403);

    const crossOrigin = await fetch(`${ORIGIN}/api/auth/unlock`, {
      method: "POST",
      headers: {
        origin: "https://evil.example",
        "x-forwarded-host": "evil.example",
        "content-type": "application/json",
      },
      body: JSON.stringify({ passphrase: ephemeralPassphrase }),
    });
    assert.equal(crossOrigin.status, 403);

    // 4. Request body validation (415, 400, 413)
    const wrongContentType = await fetch(`${ORIGIN}/api/auth/unlock`, {
      method: "POST",
      headers: { origin: ORIGIN, "content-type": "text/plain" },
      body: JSON.stringify({ passphrase: ephemeralPassphrase }),
    });
    assert.equal(wrongContentType.status, 415);

    const emptyBody = await fetch(`${ORIGIN}/api/auth/unlock`, {
      method: "POST",
      headers: { origin: ORIGIN, "content-type": "application/json" },
      body: "",
    });
    assert.equal(emptyBody.status, 400);

    const malformedJson = await fetch(`${ORIGIN}/api/auth/unlock`, {
      method: "POST",
      headers: { origin: ORIGIN, "content-type": "application/json" },
      body: "{not-json",
    });
    assert.equal(malformedJson.status, 400);

    const extraField = await fetch(`${ORIGIN}/api/auth/unlock`, {
      method: "POST",
      headers: { origin: ORIGIN, "content-type": "application/json" },
      body: JSON.stringify({ passphrase: ephemeralPassphrase, extra: true }),
    });
    assert.equal(extraField.status, 400);

    const oversized = await fetch(`${ORIGIN}/api/auth/unlock`, {
      method: "POST",
      headers: { origin: ORIGIN, "content-type": "application/json" },
      body: JSON.stringify({ passphrase: "x".repeat(1200) }),
    });
    assert.equal(oversized.status, 413);

    // 5. Wrong passphrase -> 401
    const wrongPass = await fetch(`${ORIGIN}/api/auth/unlock`, {
      method: "POST",
      headers: { origin: ORIGIN, "content-type": "application/json" },
      body: JSON.stringify({ passphrase: "definitely-wrong-passphrase" }),
    });
    assert.equal(wrongPass.status, 401);
    assert.equal(wrongPass.headers.get("set-cookie"), null);
    assert.ok((wrongPass.headers.get("cache-control") ?? "").includes("no-store"));

    // 6. Correct passphrase -> 200 + HttpOnly SameSite=Lax Secure 24h cookie
    const unlockOk = await fetch(`${ORIGIN}/api/auth/unlock`, {
      method: "POST",
      headers: { origin: ORIGIN, "content-type": "application/json" },
      body: JSON.stringify({ passphrase: ephemeralPassphrase }),
    });
    assert.equal(unlockOk.status, 200);
    const setCookie = unlockOk.headers.get("set-cookie") ?? "";
    assert.ok(setCookie.startsWith("archive_session=v1."));
    assert.ok(setCookie.includes("HttpOnly"));
    assert.ok(setCookie.includes("SameSite=lax") || setCookie.includes("SameSite=Lax"));
    assert.ok(setCookie.includes("Secure"));
    assert.ok(setCookie.includes("Max-Age=86400"));
    assert.ok(setCookie.includes("Path=/"));

    const cookiePair = setCookie.split(";")[0];

    // 7. Authorized GET / renders State 4 (Accepted) for session persistence & GET /archive -> 200 OK
    const authHome = await fetch(`${ORIGIN}/`, {
      headers: { cookie: cookiePair },
    });
    assert.equal(authHome.status, 200);
    const authHomeHtml = await authHome.text();
    assert.ok(
      authHomeHtml.includes("with sound") && authHomeHtml.includes("in silence"),
      "Authenticated reload on / must persist into State 4 (with sound / in silence)"
    );
    assert.ok(
      !authHomeHtml.includes('type="password"'),
      "Authenticated reload on / must not re-show the passphrase input"
    );

    const authArchive = await fetch(`${ORIGIN}/archive`, {
      redirect: "manual",
      headers: { cookie: cookiePair },
    });
    assert.equal(authArchive.status, 200);
    const archiveCsp = authArchive.headers.get("content-security-policy") ?? "";
    const archiveNonce = archiveCsp.match(/'nonce-([A-Za-z0-9+/=]+)'/);
    assert.ok(archiveNonce, "Missing nonce in /archive CSP header");
    assert.ok(!archiveCsp.includes("unsafe-inline"), "/archive CSP must not allow unsafe-inline");
    assert.notEqual(archiveNonce[1], nonceMatch1[1], "/archive must receive a fresh nonce");
    const archiveHtml = await authArchive.text();
    assert.ok(archiveHtml.includes(`nonce="${archiveNonce[1]}"`), "/archive HTML must contain matching nonce");
    assert.ok(archiveHtml.includes("A collection of fragments and memories."));
    assert.ok(archiveHtml.includes("Stillness"));
    assert.ok(archiveHtml.includes('href="/archive/stillness"'));
    assert.ok(archiveHtml.includes("Correspondence"));
    assert.ok(archiveHtml.includes('href="/archive/correspondence"'));
    assert.ok(archiveHtml.includes("Voices &amp; Film") || archiveHtml.includes("Voices & Film"));
    assert.ok(archiveHtml.includes("Cadenza"));
    assert.ok(!archiveHtml.includes("AU/I") && !archiveHtml.includes("AU/II") && !archiveHtml.includes("AU/III") && !archiveHtml.includes("AU/IV"));

    // 7b. Protected /archive/stillness requires auth & withholds all unconsented photographs (zero test fixtures)
    const unauthStillness = await fetch(`${ORIGIN}/archive/stillness`, {
      redirect: "manual",
    });
    assert.equal(unauthStillness.status, 307);

    const authStillness = await fetch(`${ORIGIN}/archive/stillness`, {
      redirect: "manual",
      headers: { cookie: cookiePair },
    });
    assert.equal(authStillness.status, 200);
    const stillnessHtml = await authStillness.text();
    assert.ok(stillnessHtml.includes("No photographs are available here yet."));
    assert.ok(stillnessHtml.includes("AU/I · 0 photographs"));
    assert.ok(!stillnessHtml.includes("/api/media/arc-i-01"));
    assert.ok(!stillnessHtml.includes("TEST FIXTURES"));

    // 7c. Dev-only visual test harness and fixture API must be 404 in production
    const prodHarness = await fetch(`${ORIGIN}/dev/stillness-harness`, {
      headers: { cookie: cookiePair },
    });
    assert.equal(prodHarness.status, 404);

    const prodFixture = await fetch(
      `${ORIGIN}/api/dev/stillness-fixture/fixture-landscape-01`,
      { headers: { cookie: cookiePair } }
    );
    assert.equal(prodFixture.status, 404);

    // 8. Lock endpoint origin, body validation, and cookie clearing
    const lockNoOrigin = await fetch(`${ORIGIN}/api/auth/lock`, {
      method: "POST",
    });
    assert.equal(lockNoOrigin.status, 403);

    const lockBadBody = await fetch(`${ORIGIN}/api/auth/lock`, {
      method: "POST",
      headers: { origin: ORIGIN, "content-type": "application/json" },
      body: JSON.stringify({ unexpected: 1 }),
    });
    assert.equal(lockBadBody.status, 400);

    const lockOk = await fetch(`${ORIGIN}/api/auth/lock`, {
      method: "POST",
      headers: { origin: ORIGIN },
    });
    assert.equal(lockOk.status, 200);
    const clearedCookie = lockOk.headers.get("set-cookie") ?? "";
    assert.ok(clearedCookie.includes("archive_session=;"));
    assert.ok(clearedCookie.includes("Max-Age=0"));

    // 9. Rate limiting: 5 consecutive failed attempts trigger 429 with Retry-After
    for (let i = 1; i <= 4; i++) {
      const attempt = await fetch(`${ORIGIN}/api/auth/unlock`, {
        method: "POST",
        headers: { origin: ORIGIN, "content-type": "application/json" },
        body: JSON.stringify({ passphrase: `wrong-attempt-${i}` }),
      });
      assert.equal(attempt.status, 401, `Expected 401 on attempt ${i}`);
    }

    const rateLimited = await fetch(`${ORIGIN}/api/auth/unlock`, {
      method: "POST",
      headers: { origin: ORIGIN, "content-type": "application/json" },
      body: JSON.stringify({ passphrase: "wrong-attempt-5" }),
    });
    assert.equal(rateLimited.status, 429);
    assert.ok(Number(rateLimited.headers.get("retry-after")) > 0);

    console.log("ALL 9 LIVE HTTP SECURITY INTEGRATION SUITES PASSED.");
  } finally {
    server.kill();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

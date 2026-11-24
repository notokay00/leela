import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes, scrypt } from "node:crypto";
import path from "node:path";

const PORT = 3097;
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

    // 1. Unauthenticated requests to Correspondence & direct reader URL must redirect cleanly
    const unauthRoom = await fetch(`${ORIGIN}/archive/correspondence`, {
      redirect: "manual",
    });
    assert.equal(unauthRoom.status, 307);
    assert.equal(unauthRoom.headers.get("location"), "/");

    const unauthReader = await fetch(
      `${ORIGIN}/archive/correspondence/for-you-poem`,
      { redirect: "manual" }
    );
    assert.equal(unauthReader.status, 307);
    assert.equal(unauthReader.headers.get("location"), "/");

    // 2. Development Correspondence harness must return 404 in production (unauthenticated)
    const devHarnessUnauth = await fetch(
      `${ORIGIN}/dev/correspondence-harness`
    );
    assert.equal(devHarnessUnauth.status, 404);

    const devHarnessReaderUnauth = await fetch(
      `${ORIGIN}/dev/correspondence-harness/synthetic-devanagari-calibration-01`
    );
    assert.equal(devHarnessReaderUnauth.status, 404);

    // 3. Authenticate with ephemeral passphrase
    const unlockRes = await fetch(`${ORIGIN}/api/auth/unlock`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: ORIGIN,
      },
      body: JSON.stringify({ passphrase: ephemeralPassphrase }),
    });
    assert.equal(unlockRes.status, 200);
    const setCookie = unlockRes.headers.get("set-cookie") ?? "";
    const cookieHeader = setCookie.split(";")[0];
    assert.ok(cookieHeader.includes("archive_session="));

    // 4. Authenticated Editorial Index activates Correspondence alongside Stillness and omits visible AU/ codes
    const indexRes = await fetch(`${ORIGIN}/archive`, {
      headers: { cookie: cookieHeader },
    });
    assert.equal(indexRes.status, 200);
    const indexHtml = await indexRes.text();
    assert.ok(indexHtml.includes('href="/archive/stillness"'));
    assert.ok(indexHtml.includes('href="/archive/correspondence"'));
    assert.ok(indexHtml.includes('href="/archive/voices-and-film"'));
    assert.ok(!indexHtml.includes('href="/archive/cadenza"'));
    assert.ok(!indexHtml.includes("AU/I"));
    assert.ok(!indexHtml.includes("AU/II"));
    assert.ok(!indexHtml.includes("AU/III"));
    assert.ok(!indexHtml.includes("AU/IV"));

    // 5. Authenticated Correspondence catalogue renders all 23 approved poems, strict CSP, ZERO synthetic leaks
    const roomRes = await fetch(`${ORIGIN}/archive/correspondence`, {
      headers: { cookie: cookieHeader },
    });
    assert.equal(roomRes.status, 200);
    const roomCsp = roomRes.headers.get("content-security-policy") ?? "";
    assert.ok(roomCsp.includes("'nonce-"));
    assert.ok(!roomCsp.includes("unsafe-inline"));
    assert.ok(!roomCsp.includes("unsafe-eval"));

    const roomHtml = await roomRes.text();
    assert.ok(roomHtml.includes("Correspondence"));
    assert.ok(roomHtml.includes("For You"));
    assert.ok(roomHtml.includes("यादों का मौसम"));
    assert.ok(roomHtml.includes("एहतिसाब"));
    assert.ok(roomHtml.includes("Saudade"));
    assert.ok(roomHtml.includes("Izel"));
    assert.ok(roomHtml.includes('href="/archive/correspondence/for-you-poem"'));
    assert.ok(roomHtml.includes('href="/archive/correspondence/poem-023"'));
    // Catalogue omits technical AU/II taxonomy, script descriptors, full bodies, and synthetic fixtures
    assert.ok(!roomHtml.includes("AU/II-001"));
    assert.ok(!roomHtml.includes("II · AU/II"));
    assert.ok(!roomHtml.includes("Devanagari"));
    assert.ok(!roomHtml.includes("तेरी आखों में जो देखा"));
    assert.ok(!roomHtml.includes("TEST/II-001"));
    assert.ok(!roomHtml.includes("TEST FIXTURES"));

    // 6. Authenticated individual reader routes render pure title/text/nav without catalogue metadata stack
    const readerChecks = [
      {
        slug: "for-you-poem",
        mustInclude: [
          "For You",
          "तेरी आखों में जो देखा, वहाँ ठहरा है वक़्त,",
          'href="/archive/correspondence/poem-002"',
        ],
        mustExclude: ["AU/II-001", "AU/II-002", "II · AU/II", "Hindi · Devanagari"],
      },
      {
        slug: "poem-004",
        mustInclude: [
          "एहतिसाब",
          "ख़ता तो मिट्टी की फ़ितरत है, फ़रिश्ता कौन है यहाँ, मानकर सुधर जाना ही असली सवाब है।",
          'href="/archive/correspondence/poem-003"',
          'href="/archive/correspondence/poem-005"',
        ],
        mustExclude: ["AU/II-004", "AU/II-003", "AU/II-005", "Hindi · Devanagari"],
      },
      {
        slug: "poem-010",
        mustInclude: [
          "रौशनी की दहलीज़",
          'href="/archive/correspondence/poem-009"',
          'href="/archive/correspondence/poem-011"',
        ],
        mustExclude: ["AU/II-010", "Hindi · Devanagari"],
      },
      {
        slug: "poem-022",
        mustInclude: [
          "Saudade",
          'href="/archive/correspondence/poem-021"',
          'href="/archive/correspondence/poem-023"',
        ],
        mustExclude: ["AU/II-022", "AU/II-021", "AU/II-023"],
      },
      {
        slug: "poem-023",
        mustInclude: [
          "Izel",
          'href="/archive/correspondence/poem-022"',
          "End of collection",
        ],
        mustExclude: ["AU/II-023", "AU/II-022"],
      },
    ];

    for (const check of readerChecks) {
      const readerRes = await fetch(
        `${ORIGIN}/archive/correspondence/${check.slug}`,
        { headers: { cookie: cookieHeader } }
      );
      assert.equal(
        readerRes.status,
        200,
        `Approved reader route ${check.slug} must return 200`
      );
      const readerHtml = await readerRes.text();
      const normalizedHtml = readerHtml.replace(/<!--[\s\S]*?-->/g, "");
      for (const token of check.mustInclude) {
        assert.ok(
          normalizedHtml.includes(token),
          `Reader route ${check.slug} missing expected content: ${token}`
        );
      }
      for (const forbidden of check.mustExclude) {
        assert.ok(
          !normalizedHtml.includes(forbidden),
          `Reader route ${check.slug} should omit visible metadata token: ${forbidden}`
        );
      }
    }

    // Also verify all 23 slugs return HTTP 200 when authenticated
    const allSlugs = [
      "for-you-poem",
      ...Array.from({ length: 22 }, (_, i) => `poem-${String(i + 2).padStart(3, "0")}`),
    ];
    for (const slug of allSlugs) {
      const res = await fetch(`${ORIGIN}/archive/correspondence/${slug}`, {
        headers: { cookie: cookieHeader },
      });
      assert.equal(res.status, 200, `Expected 200 for ${slug}`);
    }

    // 7. Authenticated request to synthetic fixture slug on production route returns 404
    const synthProdRes = await fetch(
      `${ORIGIN}/archive/correspondence/synthetic-devanagari-calibration-01`,
      { headers: { cookie: cookieHeader } }
    );
    assert.equal(synthProdRes.status, 404);

    // 8. Authenticated request to dev harness still returns 404 in production
    const devHarnessAuth = await fetch(`${ORIGIN}/dev/correspondence-harness`, {
      headers: { cookie: cookieHeader },
    });
    assert.equal(devHarnessAuth.status, 404);

    console.log(
      "ALL 8 LIVE HTTP CORRESPONDENCE SECURITY, CONSENT & PRODUCTION-404 SUITES PASSED."
    );
  } finally {
    server.kill("SIGTERM");
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

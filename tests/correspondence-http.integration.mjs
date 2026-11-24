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

    // 4. Authenticated Editorial Index activates Correspondence alongside Stillness
    const indexRes = await fetch(`${ORIGIN}/archive`, {
      headers: { cookie: cookieHeader },
    });
    assert.equal(indexRes.status, 200);
    const indexHtml = await indexRes.text();
    assert.ok(indexHtml.includes('href="/archive/stillness"'));
    assert.ok(indexHtml.includes('href="/archive/correspondence"'));
    assert.ok(!indexHtml.includes('href="/archive/voices-and-film"'));
    assert.ok(!indexHtml.includes('href="/archive/cadenza"'));

    // 5. Authenticated Correspondence room renders warm literary empty state & strict CSP, ZERO withheld leaks
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
    assert.ok(
      roomHtml.includes("No literary artefacts are available here yet.")
    );
    assert.ok(!roomHtml.includes("तेरी आखों"));
    assert.ok(!roomHtml.includes("for-you-poem"));
    assert.ok(!roomHtml.includes("TEST/II-001"));
    assert.ok(!roomHtml.includes("TEST FIXTURES"));

    // 6. Authenticated direct requests to withheld imported poems return 404 and leak ZERO title/text/catalogId
    const withheldChecks = [
      { slug: "for-you-poem", forbid: ["तेरी आखों", "For You", "AU/II-001"] },
      { slug: "poem-002", forbid: ["यादों का मौसम", "AU/II-002"] },
      { slug: "poem-004", forbid: ["एहतिसाब", "AU/II-004"] },
      { slug: "poem-022", forbid: ["Saudade", "AU/II-022"] },
      { slug: "poem-023", forbid: ["Izel", "AU/II-023"] },
    ];

    for (const check of withheldChecks) {
      const withheldReaderRes = await fetch(
        `${ORIGIN}/archive/correspondence/${check.slug}`,
        { headers: { cookie: cookieHeader } }
      );
      assert.equal(
        withheldReaderRes.status,
        404,
        `Withheld slug ${check.slug} must return 404`
      );
      const withheldHtml = await withheldReaderRes.text();
      for (const token of check.forbid) {
        assert.ok(
          !withheldHtml.includes(token),
          `Withheld route ${check.slug} leaked token: ${token}`
        );
      }
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

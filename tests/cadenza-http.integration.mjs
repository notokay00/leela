import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes, scrypt } from "node:crypto";
import path from "node:path";

const PORT = 3099;
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

    // 1. Unauthenticated request to Cadenza redirects cleanly to Threshold
    const unauthRoom = await fetch(`${ORIGIN}/archive/cadenza`, {
      redirect: "manual",
    });
    assert.equal(unauthRoom.status, 307);
    assert.equal(unauthRoom.headers.get("location"), "/");
    const unauthBody = await unauthRoom.text();
    assert.ok(!unauthBody.includes("Things Left Unsaid"));

    // 2. Authenticate with ephemeral passphrase
    const unlockRes = await fetch(`${ORIGIN}/api/auth/unlock`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: ORIGIN,
      },
      body: JSON.stringify({ passphrase: ephemeralPassphrase }),
    });
    assert.equal(unlockRes.status, 200);
    const cookieHeader = (unlockRes.headers.get("set-cookie") ?? "").split(";")[0];
    assert.ok(cookieHeader.includes("archive_session="));

    // 3. Authenticated Editorial Index activates all four rooms with zero visible AU/ codes
    const indexRes = await fetch(`${ORIGIN}/archive`, {
      headers: { cookie: cookieHeader },
    });
    assert.equal(indexRes.status, 200);
    const indexHtml = await indexRes.text();
    assert.ok(indexHtml.includes('href="/archive/stillness"'));
    assert.ok(indexHtml.includes('href="/archive/correspondence"'));
    assert.ok(indexHtml.includes('href="/archive/voices-and-film"'));
    assert.ok(indexHtml.includes('href="/archive/cadenza"'));
    assert.ok(!indexHtml.includes("AU/IV"));

    // 4. Voices & Film provides a quiet forward link to Cadenza
    const vfRes = await fetch(`${ORIGIN}/archive/voices-and-film`, {
      headers: { cookie: cookieHeader },
    });
    assert.equal(vfRes.status, 200);
    const vfHtml = await vfRes.text();
    assert.ok(vfHtml.includes('href="/archive/cadenza"'));

    // 5. Authenticated Cadenza renders arrival cleanly with strict nonce CSP and zero forbidden tokens
    const roomRes = await fetch(`${ORIGIN}/archive/cadenza`, {
      headers: { cookie: cookieHeader },
    });
    assert.equal(roomRes.status, 200);
    const csp = roomRes.headers.get("content-security-policy") ?? "";
    const nonceMatch = csp.match(/'nonce-([A-Za-z0-9+/=]+)'/);
    assert.ok(nonceMatch, "Missing CSP nonce on /archive/cadenza");
    assert.ok(!csp.includes("unsafe-inline"), "CSP must never permit unsafe-inline");
    assert.ok(!csp.includes("unsafe-eval"), "CSP must never permit unsafe-eval");

    const html = (await roomRes.text()).replace(/<!--[\s\S]*?-->/g, "");
    assert.ok(html.includes(`nonce="${nonceMatch[1]}"`));
    assert.ok(html.includes("Cadenza"));
    assert.ok(html.includes("Things Left Unsaid"));
    assert.ok(html.includes('href="/archive"'));
    assert.ok(!html.includes("AU/IV"));
    assert.ok(!html.includes("Untitled"));
    assert.ok(!html.includes("mailto:"));

    console.log(
      "ALL 5 LIVE HTTP CADENZA SECURITY, BOUNDARY & NAVIGATION SUITES PASSED."
    );
  } finally {
    server.kill("SIGTERM");
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

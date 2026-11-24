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

    // 1. Unauthenticated request to Voices & Film redirects cleanly without exposing room content
    const unauthRoom = await fetch(`${ORIGIN}/archive/voices-and-film`, {
      redirect: "manual",
    });
    assert.equal(unauthRoom.status, 307);
    assert.equal(unauthRoom.headers.get("location"), "/");
    const unauthBody = await unauthRoom.text();
    assert.ok(!unauthBody.includes("my personal singer"));
    assert.ok(!unauthBody.includes("Ahhh i am in love again"));

    // 2. Unauthenticated media request for withheld personal video is rejected 401
    const unauthMedia = await fetch(`${ORIGIN}/api/media/arc-iii-01-film`);
    assert.equal(unauthMedia.status, 401);

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
    const cookieHeader = (unlockRes.headers.get("set-cookie") ?? "").split(";")[0];
    assert.ok(cookieHeader.includes("archive_session="));

    // 4. Authenticated Editorial Index activates Voices & Film without visible AU/ codes
    const indexRes = await fetch(`${ORIGIN}/archive`, {
      headers: { cookie: cookieHeader },
    });
    assert.equal(indexRes.status, 200);
    const indexHtml = await indexRes.text();
    assert.ok(indexHtml.includes('href="/archive/voices-and-film"'));
    assert.ok(!indexHtml.includes('href="/archive/cadenza"'));
    assert.ok(!indexHtml.includes("AU/III"));

    // 5. Authenticated Voices & Film returns 200 with strict nonce CSP and exact section order
    const roomRes = await fetch(`${ORIGIN}/archive/voices-and-film`, {
      headers: { cookie: cookieHeader },
    });
    assert.equal(roomRes.status, 200);
    const csp = roomRes.headers.get("content-security-policy") ?? "";
    const nonceMatch = csp.match(/'nonce-([A-Za-z0-9+/=]+)'/);
    assert.ok(nonceMatch, "Missing CSP nonce on /archive/voices-and-film");
    assert.ok(!csp.includes("unsafe-inline"), "CSP must never permit unsafe-inline");
    assert.ok(!csp.includes("unsafe-eval"), "CSP must never permit unsafe-eval");

    const html = (await roomRes.text()).replace(/<!--[\s\S]*?-->/g, "");
    assert.ok(html.includes(`nonce="${nonceMatch[1]}"`));
    assert.ok(html.includes("Voices &amp; Film") || html.includes("Voices & Film"));

    // Exact three section titles in exact order
    const idx1 = html.indexOf("my personal singer");
    const idx2 = html.indexOf("Ahhh i am in love again");
    const idx3 = html.indexOf("Noice");
    assert.ok(idx1 > 0, "Missing section title: my personal singer");
    assert.ok(idx2 > idx1, "Section 'Ahhh i am in love again' must follow 'my personal singer'");
    assert.ok(idx3 > idx2, "Section 'Noice' must follow 'Ahhh i am in love again'");

    // Return to Index link present; technical catalogue taxonomy absent
    assert.ok(html.includes('href="/archive"'));
    assert.ok(!html.includes("AU/III"));
    assert.ok(!html.includes("ARC-III-01"));

    // Zero fabricated video elements and zero leaked withheld personal media identifiers/paths
    assert.ok(!html.includes("<video"));
    assert.ok(!html.includes("arc-iii-01-film"));
    assert.ok(!html.includes("leela-poem-film"));
    assert.ok(!html.includes("leela_poem.mp4"));

    // 6. Authenticated request to withheld personal media asset still returns uniform 404
    const withheldRes = await fetch(`${ORIGIN}/api/media/arc-iii-01-film`, {
      headers: { cookie: cookieHeader },
    });
    const unknownRes = await fetch(`${ORIGIN}/api/media/nonexistent-asset-99`, {
      headers: { cookie: cookieHeader },
    });
    assert.equal(withheldRes.status, 404);
    assert.equal(unknownRes.status, 404);
    assert.equal(await withheldRes.text(), await unknownRes.text());

    console.log(
      "ALL 6 LIVE HTTP VOICES & FILM SECURITY, CONSENT & EMPTY-STATE SUITES PASSED."
    );
  } finally {
    server.kill("SIGTERM");
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

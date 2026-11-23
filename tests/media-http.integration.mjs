import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHmac, randomBytes, scrypt } from "node:crypto";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const PORT = 3095;
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

function createSyntheticToken(secretHex, issuedAt, expiresAt) {
  const secret = Buffer.from(secretHex, "hex");
  const nonce = randomBytes(16).toString("base64url");
  const payload = `v1.${issuedAt}.${expiresAt}.${nonce}`;
  const sig = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${sig}`;
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
  const tmpRoot = await mkdtemp(path.join(os.tmpdir(), "leela-media-http-"));
  const mediaRoot = path.join(tmpRoot, "media");
  const manifestPath = path.join(tmpRoot, "synthetic-manifest.json");

  await mkdir(path.join(mediaRoot, "video"), { recursive: true });
  await mkdir(path.join(mediaRoot, "audio"), { recursive: true });

  // Synthetic non-personal fixtures (deterministic patterns, zero personal data)
  const videoBytes = Buffer.alloc(65_536);
  Buffer.from([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70]).copy(videoBytes, 0);
  for (let i = 8; i < videoBytes.length; i++) {
    videoBytes[i] = i % 251;
  }

  const audioBytes = Buffer.alloc(32_768);
  Buffer.from([0x49, 0x44, 0x33, 0x03, 0x00, 0x00]).copy(audioBytes, 0);
  for (let i = 6; i < audioBytes.length; i++) {
    audioBytes[i] = (i * 7) % 251;
  }

  const withheldBytes = Buffer.from("synthetic-withheld-must-never-be-served");

  await writeFile(path.join(mediaRoot, "video", "synth-video.mp4"), videoBytes);
  await writeFile(path.join(mediaRoot, "audio", "synth-audio.mp3"), audioBytes);
  await writeFile(
    path.join(mediaRoot, "video", "synth-withheld.mp4"),
    withheldBytes
  );

  const manifest = [
    {
      id: "synth-video-01",
      storageRelativePath: "video/synth-video.mp4",
      mimeType: "video/mp4",
      downloadFilename: "synth-video.mp4",
      sensitivity: "high",
      publishStatus: "ready",
      consentConfirmed: true,
    },
    {
      id: "synth-audio-01",
      storageRelativePath: "audio/synth-audio.mp3",
      mimeType: "audio/mpeg",
      downloadFilename: "synth-audio.mp3",
      sensitivity: "standard",
      publishStatus: "ready",
      consentConfirmed: true,
    },
    {
      id: "synth-withheld-01",
      storageRelativePath: "video/synth-withheld.mp4",
      mimeType: "video/mp4",
      downloadFilename: "synth-withheld.mp4",
      sensitivity: "high",
      publishStatus: "withheld",
      consentConfirmed: false,
    },
  ];
  await writeFile(manifestPath, JSON.stringify(manifest), "utf8");

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
      STORAGE_DRIVER: "local-fs",
      LOCAL_MEDIA_ROOT: mediaRoot,
      ARCHIVE_ENABLE_SYNTHETIC_TEST_FIXTURES: "1",
      ARCHIVE_SYNTHETIC_MEDIA_MANIFEST: manifestPath,
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

    // 1. Direct unauthorized access to /api/media (independent of proxy.ts, which excludes /api/*)
    const unauthGet = await fetch(`${ORIGIN}/api/media/synth-video-01`);
    assert.equal(unauthGet.status, 401);
    assert.ok((unauthGet.headers.get("cache-control") ?? "").includes("no-store"));

    const unauthHead = await fetch(`${ORIGIN}/api/media/synth-video-01`, {
      method: "HEAD",
    });
    assert.equal(unauthHead.status, 401);

    const unauthMissingId = await fetch(`${ORIGIN}/api/media`);
    assert.equal(unauthMissingId.status, 401);

    // Expired & tampered sessions rejected directly by media endpoint DAL
    const expiredToken = createSyntheticToken(
      sessionSecret,
      Math.floor(Date.now() / 1000) - 90_000,
      Math.floor(Date.now() / 1000) - 3_600
    );
    const expiredRes = await fetch(`${ORIGIN}/api/media/synth-video-01`, {
      headers: { cookie: `archive_session=${expiredToken}` },
    });
    assert.equal(expiredRes.status, 401);

    const tamperedRes = await fetch(`${ORIGIN}/api/media/synth-video-01`, {
      headers: { cookie: "archive_session=v1.1800000000.1800086400.bad.sig" },
    });
    assert.equal(tamperedRes.status, 401);

    // 2. Authenticate via POST /api/auth/unlock
    const unlock = await fetch(`${ORIGIN}/api/auth/unlock`, {
      method: "POST",
      headers: { origin: ORIGIN, "content-type": "application/json" },
      body: JSON.stringify({ passphrase: ephemeralPassphrase }),
    });
    assert.equal(unlock.status, 200);
    const cookiePair = (unlock.headers.get("set-cookie") ?? "").split(";")[0];
    assert.ok(cookiePair.startsWith("archive_session=v1."));

    // 3. Privacy & allowlist enforcement (missing ID, unknown, withheld personal, withheld synthetic, traversal)
    const missingId = await fetch(`${ORIGIN}/api/media`, {
      headers: { cookie: cookiePair },
    });
    assert.equal(missingId.status, 404);

    const unknownRes = await fetch(`${ORIGIN}/api/media/unknown-asset-99`, {
      headers: { cookie: cookiePair },
    });
    assert.equal(unknownRes.status, 404);
    const unknownText = await unknownRes.text();

    const withheldPersonal = await fetch(`${ORIGIN}/api/media/arc-iii-01-film`, {
      headers: { cookie: cookiePair },
    });
    assert.equal(withheldPersonal.status, 404);
    assert.equal(await withheldPersonal.text(), unknownText);

    const withheldSynth = await fetch(`${ORIGIN}/api/media/synth-withheld-01`, {
      headers: { cookie: cookiePair },
    });
    assert.equal(withheldSynth.status, 404);
    assert.equal(await withheldSynth.text(), unknownText);

    for (const badPath of [
      "/api/media/video/synth-video.mp4",
      "/api/media/..%2Fpackage.json",
      "/api/media/C:%5CWindows%5Cwin.ini",
    ]) {
      const badRes = await fetch(`${ORIGIN}${badPath}`, {
        headers: { cookie: cookiePair },
      });
      assert.equal(badRes.status, 404);
      const bodyText = await badRes.text();
      assert.ok(!bodyText.includes(mediaRoot), "Error must never expose storage root");
      assert.ok(!bodyText.includes("synth-video.mp4"), "Error must never expose filenames");
    }

    // 4. HEAD returns full representation metadata with empty body
    const headRes = await fetch(`${ORIGIN}/api/media/synth-video-01`, {
      method: "HEAD",
      headers: { cookie: cookiePair },
    });
    assert.equal(headRes.status, 200);
    assert.equal(headRes.headers.get("content-type"), "video/mp4");
    assert.equal(headRes.headers.get("content-length"), String(videoBytes.length));
    assert.equal(headRes.headers.get("accept-ranges"), "bytes");
    assert.equal(
      headRes.headers.get("content-disposition"),
      'inline; filename="synth-video.mp4"'
    );
    assert.equal(headRes.headers.get("x-content-type-options"), "nosniff");
    assert.equal(
      headRes.headers.get("cache-control"),
      "private, no-store, max-age=0"
    );
    assert.equal((await headRes.arrayBuffer()).byteLength, 0);

    // 5. GET without Range -> 200 OK (video + audio)
    const fullVideo = await fetch(`${ORIGIN}/api/media/synth-video-01`, {
      headers: { cookie: cookiePair },
    });
    assert.equal(fullVideo.status, 200);
    assert.equal(fullVideo.headers.get("content-type"), "video/mp4");
    assert.equal(fullVideo.headers.get("content-length"), String(videoBytes.length));
    assert.ok(Buffer.from(await fullVideo.arrayBuffer()).equals(videoBytes));

    const fullAudio = await fetch(`${ORIGIN}/api/media/synth-audio-01`, {
      headers: { cookie: cookiePair },
    });
    assert.equal(fullAudio.status, 200);
    assert.equal(fullAudio.headers.get("content-type"), "audio/mpeg");
    assert.equal(
      fullAudio.headers.get("cache-control"),
      "private, max-age=300, no-transform"
    );
    assert.ok(Buffer.from(await fullAudio.arrayBuffer()).equals(audioBytes));

    // 6. GET with valid satisfiable single-byte ranges -> 206 Partial Content
    const rangeStartEnd = await fetch(`${ORIGIN}/api/media/synth-video-01`, {
      headers: { cookie: cookiePair, range: "bytes=0-1023" },
    });
    assert.equal(rangeStartEnd.status, 206);
    assert.equal(rangeStartEnd.headers.get("content-range"), "bytes 0-1023/65536");
    assert.equal(rangeStartEnd.headers.get("content-length"), "1024");
    assert.ok(
      Buffer.from(await rangeStartEnd.arrayBuffer()).equals(
        videoBytes.subarray(0, 1024)
      )
    );

    const rangeOpenEnd = await fetch(`${ORIGIN}/api/media/synth-video-01`, {
      headers: { cookie: cookiePair, range: "bytes=64512-" },
    });
    assert.equal(rangeOpenEnd.status, 206);
    assert.equal(rangeOpenEnd.headers.get("content-range"), "bytes 64512-65535/65536");
    assert.equal(rangeOpenEnd.headers.get("content-length"), "1024");
    assert.ok(
      Buffer.from(await rangeOpenEnd.arrayBuffer()).equals(
        videoBytes.subarray(64512)
      )
    );

    const rangeSuffix = await fetch(`${ORIGIN}/api/media/synth-video-01`, {
      headers: { cookie: cookiePair, range: "bytes=-512" },
    });
    assert.equal(rangeSuffix.status, 206);
    assert.equal(rangeSuffix.headers.get("content-range"), "bytes 65024-65535/65536");
    assert.equal(rangeSuffix.headers.get("content-length"), "512");
    assert.ok(
      Buffer.from(await rangeSuffix.arrayBuffer()).equals(
        videoBytes.subarray(videoBytes.length - 512)
      )
    );

    // 7. Valid unsatisfiable Range -> 416 with Content-Range: bytes */size
    const rangeUnsat = await fetch(`${ORIGIN}/api/media/synth-video-01`, {
      headers: { cookie: cookiePair, range: "bytes=999999-" },
    });
    assert.equal(rangeUnsat.status, 416);
    assert.equal(rangeUnsat.headers.get("content-range"), "bytes */65536");

    // 8. Malformed, reversed, multi-range, and unsupported units -> ignore Range, return 200
    for (const ignoredRange of [
      "bytes=abc-def",
      "bytes=500-100",
      "bytes=0-10, 20-30",
      "items=0-10",
    ]) {
      const fallback = await fetch(`${ORIGIN}/api/media/synth-video-01`, {
        headers: { cookie: cookiePair, range: ignoredRange },
      });
      assert.equal(
        fallback.status,
        200,
        `Expected 200 fallback for Range: ${ignoredRange}`
      );
      assert.equal(fallback.headers.get("content-length"), String(videoBytes.length));
      assert.equal((await fallback.arrayBuffer()).byteLength, videoBytes.length);
    }

    // 9. Client disconnect / abort stream cleanup leaves server healthy
    const controller = new AbortController();
    const abortRes = await fetch(`${ORIGIN}/api/media/synth-video-01`, {
      headers: { cookie: cookiePair },
      signal: controller.signal,
    });
    assert.equal(abortRes.status, 200);
    const reader = abortRes.body.getReader();
    await reader.read();
    controller.abort();
    await reader.cancel().catch(() => {});

    // Follow-up request succeeds cleanly after mid-stream abort
    const afterAbort = await fetch(`${ORIGIN}/api/media/synth-audio-01`, {
      method: "HEAD",
      headers: { cookie: cookiePair },
    });
    assert.equal(afterAbort.status, 200);

    console.log("ALL 9 LIVE HTTP MEDIA SECURITY & RANGE SUITES PASSED.");
  } finally {
    server.kill();
    await rm(tmpRoot, { recursive: true, force: true });
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

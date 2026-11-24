import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes, scrypt } from "node:crypto";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const PORT_PROD = 3098;
const PORT_SYNTH = 3099;

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

/**
 * Generates a valid deterministic PCM WAV tone buffer purely for isolated
 * synthetic testing (never committed, never part of production content).
 */
function generateSyntheticWav(freqHz, durationSeconds = 4, sampleRate = 22050) {
  const numSamples = Math.floor(sampleRate * durationSeconds);
  const dataSize = numSamples * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16); // PCM chunk size
  buffer.writeUInt16LE(1, 20); // PCM format
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const sample = Math.sin(2 * Math.PI * freqHz * t) * 0.25;
    buffer.writeInt16LE(Math.round(sample * 32767), 44 + i * 2);
  }
  return buffer;
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

async function unlockSession(origin, passphrase) {
  const res = await fetch(`${origin}/api/auth/unlock`, {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify({ passphrase }),
  });
  assert.equal(res.status, 200);
  const cookiePair = (res.headers.get("set-cookie") ?? "").split(";")[0];
  assert.ok(cookiePair.startsWith("archive_session=v1."));
  return cookiePair;
}

function spawnNextStart(port, envOverrides) {
  const nextBin = path.resolve(
    process.cwd(),
    "node_modules",
    "next",
    "dist",
    "bin",
    "next"
  );
  return spawn(process.execPath, [nextBin, "start", "-p", String(port)], {
    env: {
      ...process.env,
      NODE_ENV: "production",
      ...envOverrides,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
}

async function runDefaultProductionSuite(passphrase, passphraseHash, sessionSecret) {
  const origin = `http://localhost:${PORT_PROD}`;
  const server = spawnNextStart(PORT_PROD, {
    APP_ORIGIN: origin,
    ARCHIVE_PASSPHRASE_HASH: passphraseHash,
    ARCHIVE_SESSION_SECRET: sessionSecret,
    ARCHIVE_ENABLE_SYNTHETIC_TEST_FIXTURES: "0",
  });

  let stderrBuf = "";
  server.stderr.on("data", (chunk) => {
    stderrBuf += chunk.toString();
  });

  try {
    await waitForServer(`${origin}/`).catch((err) => {
      throw new Error(`${err.message}\nServer stderr:\n${stderrBuf}`);
    });

    // 1. Unauthenticated Threshold leaks ZERO poem soundtrack metadata or internal IDs
    const thresholdHtml = await (await fetch(`${origin}/`)).text();
    assert.equal(thresholdHtml.includes("Hothon Se Chhu Lo Tum"), false);
    assert.equal(thresholdHtml.includes("Futile Devices"), false);
    assert.equal(thresholdHtml.includes("snd-poem-001"), false);
    assert.equal(thresholdHtml.includes("arc-snd-poem-001"), false);

    // 2. Authenticate and verify default unavailable soundtrack across rooms
    const cookie = await unlockSession(origin, passphrase);

    for (const route of [
      "/archive",
      "/archive/stillness",
      "/archive/correspondence",
      "/archive/correspondence/for-you-poem",
      "/archive/voices-and-film",
      "/archive/cadenza",
    ]) {
      const res = await fetch(`${origin}${route}`, {
        headers: { cookie },
      });
      assert.equal(res.status, 200, `Expected 200 on ${route}`);
      const html = await res.text();
      assert.ok(html.includes('data-audio-status="unavailable"'), `Missing unavailable dock status on ${route}`);
      assert.ok(html.includes("Concierto de Aranjuez, II. Adagio"), `Missing Rodrigo title on ${route}`);
      assert.ok(html.includes("Joaquín Rodrigo"), `Missing Rodrigo artist on ${route}`);
      assert.equal(html.includes("/api/media/arc-score-aranjuez"), false, `Unexpected fake stream URL on ${route}`);
      assert.equal(html.includes("/api/media/arc-snd-poem-"), false, `Unexpected fake poem stream URL on ${route}`);
    }

    // 3. Unconnected soundtrack media endpoints return uniform 404
    for (const id of ["arc-score-aranjuez", "arc-snd-poem-001", "arc-snd-poem-023"]) {
      const res = await fetch(`${origin}/api/media/${id}`, {
        headers: { cookie },
      });
      assert.equal(res.status, 404);
    }
  } finally {
    server.kill();
  }
}

async function runSyntheticAudioSuite(passphrase, passphraseHash, sessionSecret) {
  const origin = `http://localhost:${PORT_SYNTH}`;
  const tmpRoot = await mkdtemp(path.join(os.tmpdir(), "leela-soundtrack-http-"));
  const mediaRoot = path.join(tmpRoot, "media");
  const manifestPath = path.join(tmpRoot, "soundtrack-manifest.json");

  await mkdir(path.join(mediaRoot, "audio"), { recursive: true });

  const rodrigoWav = generateSyntheticWav(261.63, 3);
  const poem1Wav = generateSyntheticWav(329.63, 3);
  const consentOnlyWav = generateSyntheticWav(392.0, 2);

  await writeFile(path.join(mediaRoot, "audio", "synth-rodrigo.wav"), rodrigoWav);
  await writeFile(path.join(mediaRoot, "audio", "synth-poem-001.wav"), poem1Wav);
  await writeFile(path.join(mediaRoot, "audio", "synth-poem-002.wav"), consentOnlyWav);

  const manifest = [
    {
      id: "arc-score-aranjuez",
      storageRelativePath: "audio/synth-rodrigo.wav",
      mimeType: "audio/wav",
      downloadFilename: "synth-rodrigo.wav",
      sensitivity: "standard",
      publishStatus: "ready",
      consentConfirmed: false,
      assetCategory: "music-soundtrack",
      hostingRightsConfirmed: true,
    },
    {
      id: "arc-snd-poem-001",
      storageRelativePath: "audio/synth-poem-001.wav",
      mimeType: "audio/wav",
      downloadFilename: "synth-poem-001.wav",
      sensitivity: "standard",
      publishStatus: "ready",
      consentConfirmed: false,
      assetCategory: "music-soundtrack",
      hostingRightsConfirmed: true,
    },
    {
      // Deliberately has personal consentConfirmed=true but hostingRightsConfirmed=false:
      // MUST remain blocked because personal consent never substitutes for music rights!
      id: "arc-snd-poem-002",
      storageRelativePath: "audio/synth-poem-002.wav",
      mimeType: "audio/wav",
      downloadFilename: "synth-poem-002.wav",
      sensitivity: "standard",
      publishStatus: "ready",
      consentConfirmed: true,
      assetCategory: "music-soundtrack",
      hostingRightsConfirmed: false,
    },
  ];
  await writeFile(manifestPath, JSON.stringify(manifest), "utf8");

  const server = spawnNextStart(PORT_SYNTH, {
    APP_ORIGIN: origin,
    STORAGE_DRIVER: "local-fs",
    LOCAL_MEDIA_ROOT: mediaRoot,
    ARCHIVE_ENABLE_SYNTHETIC_TEST_FIXTURES: "1",
    ARCHIVE_SYNTHETIC_MEDIA_MANIFEST: manifestPath,
    ARCHIVE_PASSPHRASE_HASH: passphraseHash,
    ARCHIVE_SESSION_SECRET: sessionSecret,
  });

  let stderrBuf = "";
  server.stderr.on("data", (chunk) => {
    stderrBuf += chunk.toString();
  });

  try {
    await waitForServer(`${origin}/`).catch((err) => {
      throw new Error(`${err.message}\nServer stderr:\n${stderrBuf}`);
    });

    // 1. Unauthenticated audio endpoints strictly return 401
    for (const id of ["arc-score-aranjuez", "arc-snd-poem-001"]) {
      const unauth = await fetch(`${origin}/api/media/${id}`);
      assert.equal(unauth.status, 401);
    }

    // 2. Unauthenticated Threshold still leaks ZERO poem tracks even when fixtures exist
    const unauthThreshold = await (await fetch(`${origin}/`)).text();
    assert.equal(unauthThreshold.includes("Hothon Se Chhu Lo Tum"), false);
    assert.equal(unauthThreshold.includes("/api/media/arc-snd-poem-001"), false);

    // 3. Authenticate and verify approved music-soundtrack streaming + Range requests
    const cookie = await unlockSession(origin, passphrase);

    const rodrigoRes = await fetch(`${origin}/api/media/arc-score-aranjuez`, {
      headers: { cookie },
    });
    assert.equal(rodrigoRes.status, 200);
    assert.equal(rodrigoRes.headers.get("content-type"), "audio/wav");
    assert.equal(rodrigoRes.headers.get("accept-ranges"), "bytes");
    assert.ok(Buffer.from(await rodrigoRes.arrayBuffer()).equals(rodrigoWav));

    const rangeRes = await fetch(`${origin}/api/media/arc-snd-poem-001`, {
      headers: { cookie, range: "bytes=0-511" },
    });
    assert.equal(rangeRes.status, 206);
    assert.equal(rangeRes.headers.get("content-length"), "512");
    assert.ok(
      Buffer.from(await rangeRes.arrayBuffer()).equals(poem1Wav.subarray(0, 512))
    );

    // 4. Music record with consentConfirmed=true & hostingRightsConfirmed=false is strictly 404
    const consentOnlyRes = await fetch(`${origin}/api/media/arc-snd-poem-002`, {
      headers: { cookie },
    });
    assert.equal(consentOnlyRes.status, 404);

    // 5. Authenticated poem page includes approved poem stream URL and excludes unapproved poem-002
    const poemPageHtml = await (
      await fetch(`${origin}/archive/correspondence/for-you-poem`, {
        headers: { cookie },
      })
    ).text();
    assert.ok(poemPageHtml.includes("/api/media/arc-score-aranjuez"));
    assert.ok(poemPageHtml.includes("/api/media/arc-snd-poem-001"));
    assert.equal(poemPageHtml.includes("/api/media/arc-snd-poem-002"), false);
  } finally {
    server.kill();
    await rm(tmpRoot, { recursive: true, force: true });
  }
}

async function run() {
  const ephemeralPassphrase = randomBytes(20).toString("base64url");
  const passphraseHash = await scryptHash(ephemeralPassphrase);
  const sessionSecret = randomBytes(32).toString("hex");

  await runDefaultProductionSuite(ephemeralPassphrase, passphraseHash, sessionSecret);
  await runSyntheticAudioSuite(ephemeralPassphrase, passphraseHash, sessionSecret);

  console.log("ALL LIVE HTTP SOUNDTRACK SECURITY, AVAILABILITY & RIGHTS SUITES PASSED.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

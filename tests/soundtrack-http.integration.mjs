import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes, scrypt } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const PORT_PROD = 3098;
const PORT_SYNTH = 3099;

const ALL_24_TRACKS = [
  { id: "arc-score-aranjuez", mimeType: "audio/mpeg", ext: "mp3" },
  ...Array.from({ length: 23 }, (_, idx) => {
    const num = String(idx + 1).padStart(3, "0");
    const isTrack022 = idx + 1 === 22;
    return {
      id: `arc-snd-poem-${num}`,
      mimeType: isTrack022 ? "audio/mp4" : "audio/mpeg",
      ext: isTrack022 ? "m4a" : "mp3",
    };
  }),
];

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

function generateSyntheticWav(freqHz, durationSeconds = 3, sampleRate = 22050) {
  const numSamples = Math.floor(sampleRate * durationSeconds);
  const dataSize = numSamples * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
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

async function createFallbackSoundtracksRoot() {
  const tmpRoot = await mkdtemp(path.join(os.tmpdir(), "leela-snd-prod-"));
  const soundtracksDir = path.join(tmpRoot, "soundtracks");
  await mkdir(soundtracksDir, { recursive: true });

  for (const track of ALL_24_TRACKS) {
    const bytes = Buffer.alloc(4096);
    if (track.ext === "m4a") {
      Buffer.from([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x4d, 0x34, 0x41, 0x20]).copy(bytes, 0);
    } else {
      Buffer.from([0x49, 0x44, 0x33, 0x03, 0x00, 0x00]).copy(bytes, 0);
    }
    for (let i = 16; i < bytes.length; i++) {
      bytes[i] = (i * 13) % 251;
    }
    await writeFile(path.join(soundtracksDir, `${track.id}.${track.ext}`), bytes);
  }
  return tmpRoot;
}

async function runActiveProductionSuite(passphrase, passphraseHash, sessionSecret) {
  const origin = `http://localhost:${PORT_PROD}`;
  const requestedDriver = (
    process.env.SOUNDTRACK_HTTP_STORAGE_DRIVER ?? "local-fs"
  ).trim();

  let tempFallbackRoot = null;
  const envOverrides = {
    APP_ORIGIN: origin,
    STORAGE_DRIVER: requestedDriver,
    ARCHIVE_PASSPHRASE_HASH: passphraseHash,
    ARCHIVE_SESSION_SECRET: sessionSecret,
    ARCHIVE_ENABLE_SYNTHETIC_TEST_FIXTURES: "0",
  };

  if (requestedDriver === "local-fs") {
    const stagedRoot = process.env.LOCAL_MEDIA_ROOT || "D:\\leela-archive-media";
    if (existsSync(path.join(stagedRoot, "soundtracks", "arc-snd-poem-022.m4a"))) {
      envOverrides.LOCAL_MEDIA_ROOT = stagedRoot;
    } else {
      tempFallbackRoot = await createFallbackSoundtracksRoot();
      envOverrides.LOCAL_MEDIA_ROOT = tempFallbackRoot;
    }
  }

  const server = spawnNextStart(PORT_PROD, envOverrides);
  let stderrBuf = "";
  server.stderr.on("data", (chunk) => {
    stderrBuf += chunk.toString();
  });

  try {
    await waitForServer(`${origin}/`).catch((err) => {
      throw new Error(`${err.message}\nServer stderr:\n${stderrBuf}`);
    });

    // 1. Unauthenticated Threshold leaks ZERO poem soundtrack metadata or poem asset IDs
    const thresholdHtml = await (await fetch(`${origin}/`)).text();
    assert.equal(thresholdHtml.includes("Hothon Se Chhu Lo Tum"), false);
    assert.equal(thresholdHtml.includes("Old Money"), false);
    assert.equal(thresholdHtml.includes("Futile Devices"), false);
    assert.equal(thresholdHtml.includes("snd-poem-001"), false);
    assert.equal(thresholdHtml.includes("arc-snd-poem-001"), false);

    // 2. Unauthenticated GET and HEAD on private soundtrack endpoints strictly return 401
    for (const id of [
      "arc-score-aranjuez",
      "arc-snd-poem-001",
      "arc-snd-poem-022",
      "arc-snd-poem-023",
    ]) {
      const unauthGet = await fetch(`${origin}/api/media/${id}`);
      assert.equal(unauthGet.status, 401, `Expected 401 GET on ${id}`);
      assert.ok((unauthGet.headers.get("cache-control") ?? "").includes("no-store"));

      const unauthHead = await fetch(`${origin}/api/media/${id}`, {
        method: "HEAD",
      });
      assert.equal(unauthHead.status, 401, `Expected 401 HEAD on ${id}`);
    }

    // 3. Authenticate and verify room pages + authenticated soundtrack metadata hydration
    const cookie = await unlockSession(origin, passphrase);

    for (const route of [
      "/archive",
      "/archive/stillness",
      "/archive/correspondence",
      "/archive/correspondence/for-you-poem",
      "/archive/correspondence/poem-022",
      "/archive/voices-and-film",
      "/archive/cadenza",
    ]) {
      const res = await fetch(`${origin}${route}`, {
        headers: { cookie },
      });
      assert.equal(res.status, 200, `Expected 200 on ${route}`);
      const html = await res.text();
      assert.ok(html.includes("Concierto de Aranjuez, II. Adagio"), `Missing Rodrigo title on ${route}`);
      assert.ok(html.includes("Joaquín Rodrigo"), `Missing Rodrigo artist on ${route}`);
      assert.ok(html.includes("/api/media/arc-score-aranjuez"), `Missing Rodrigo stream URL on ${route}`);
      assert.ok(html.includes("/api/media/arc-snd-poem-001"), `Missing poem 001 URL on ${route}`);
      assert.ok(html.includes("/api/media/arc-snd-poem-022"), `Missing poem 022 URL on ${route}`);
      assert.equal(html.includes("/api/media/arc-iii-01-film"), false, `Withheld personal media leaked on ${route}`);
    }

    // 4. Verify HEAD across ALL 24 approved soundtracks (correct MIME, no-store, Accept-Ranges, non-zero size)
    const trackSizes = new Map();
    for (const track of ALL_24_TRACKS) {
      const headRes = await fetch(`${origin}/api/media/${track.id}`, {
        method: "HEAD",
        headers: { cookie },
      });
      assert.equal(headRes.status, 200, `HEAD failed for ${track.id} (driver=${requestedDriver})`);
      assert.equal(headRes.headers.get("content-type"), track.mimeType, `Wrong MIME for ${track.id}`);
      assert.equal(headRes.headers.get("accept-ranges"), "bytes");
      assert.equal(
        headRes.headers.get("cache-control"),
        "private, no-store, max-age=0"
      );
      assert.equal(headRes.headers.get("x-content-type-options"), "nosniff");
      const contentLength = Number(headRes.headers.get("content-length"));
      assert.ok(Number.isSafeInteger(contentLength) && contentLength > 1024, `Invalid size for ${track.id}`);
      assert.equal((await headRes.arrayBuffer()).byteLength, 0);
      trackSizes.set(track.id, contentLength);
    }

    // 5. Verify authenticated byte-range GET (206), suffix range (206), and unsatisfiable range (416)
    for (const track of [
      ALL_24_TRACKS[0],
      ALL_24_TRACKS[1],
      ALL_24_TRACKS[22], // track 022 (audio/mp4 M4A)
      ALL_24_TRACKS[23],
    ]) {
      const totalSize = trackSizes.get(track.id);
      const startRange = await fetch(`${origin}/api/media/${track.id}`, {
        headers: { cookie, range: "bytes=0-1023" },
      });
      assert.equal(startRange.status, 206, `Expected 206 for ${track.id}`);
      assert.equal(startRange.headers.get("content-type"), track.mimeType);
      assert.equal(
        startRange.headers.get("content-range"),
        `bytes 0-1023/${totalSize}`
      );
      assert.equal(startRange.headers.get("content-length"), "1024");
      assert.equal(
        startRange.headers.get("cache-control"),
        "private, no-store, max-age=0"
      );
      const firstSlice = Buffer.from(await startRange.arrayBuffer());
      assert.equal(firstSlice.length, 1024);

      if (track.id === "arc-snd-poem-022") {
        // Verify ISO BMFF / M4A ftyp box header
        assert.equal(firstSlice.subarray(4, 8).toString("ascii"), "ftyp");
      }

      const suffixRange = await fetch(`${origin}/api/media/${track.id}`, {
        headers: { cookie, range: "bytes=-256" },
      });
      assert.equal(suffixRange.status, 206);
      assert.equal(
        suffixRange.headers.get("content-range"),
        `bytes ${totalSize - 256}-${totalSize - 1}/${totalSize}`
      );
      assert.equal((await suffixRange.arrayBuffer()).byteLength, 256);

      const unsatRange = await fetch(`${origin}/api/media/${track.id}`, {
        headers: { cookie, range: `bytes=${totalSize + 100}-` },
      });
      assert.equal(unsatRange.status, 416);
      assert.equal(
        unsatRange.headers.get("content-range"),
        `bytes */${totalSize}`
      );
    }

    // 6. Withheld personal media asset MUST remain strictly 404
    const withheldPersonal = await fetch(`${origin}/api/media/arc-iii-01-film`, {
      headers: { cookie },
    });
    assert.equal(withheldPersonal.status, 404);
  } finally {
    server.kill();
    if (tempFallbackRoot) {
      await rm(tempFallbackRoot, { recursive: true, force: true });
    }
  }
}

async function runSyntheticRightsIsolationSuite(passphrase, passphraseHash, sessionSecret) {
  const origin = `http://localhost:${PORT_SYNTH}`;
  const tmpRoot = await mkdtemp(path.join(os.tmpdir(), "leela-soundtrack-http-"));
  const mediaRoot = path.join(tmpRoot, "media");
  const manifestPath = path.join(tmpRoot, "soundtrack-manifest.json");

  await mkdir(path.join(mediaRoot, "audio"), { recursive: true });

  const approvedWav = generateSyntheticWav(261.63, 2);
  const consentOnlyWav = generateSyntheticWav(392.0, 2);

  await writeFile(path.join(mediaRoot, "audio", "synth-music-ok.wav"), approvedWav);
  await writeFile(path.join(mediaRoot, "audio", "synth-music-blocked.wav"), consentOnlyWav);

  const manifest = [
    {
      id: "synth-music-approved",
      storageRelativePath: "audio/synth-music-ok.wav",
      mimeType: "audio/wav",
      downloadFilename: "synth-music-ok.wav",
      sensitivity: "high",
      publishStatus: "ready",
      consentConfirmed: false,
      assetCategory: "music-soundtrack",
      hostingRightsConfirmed: true,
    },
    {
      // Deliberately has personal consentConfirmed=true but hostingRightsConfirmed=false:
      // MUST remain blocked because personal consent never substitutes for music rights!
      id: "synth-music-consent-only",
      storageRelativePath: "audio/synth-music-blocked.wav",
      mimeType: "audio/wav",
      downloadFilename: "synth-music-blocked.wav",
      sensitivity: "high",
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

    const unauth = await fetch(`${origin}/api/media/synth-music-approved`);
    assert.equal(unauth.status, 401);

    const cookie = await unlockSession(origin, passphrase);

    const approvedRes = await fetch(`${origin}/api/media/synth-music-approved`, {
      headers: { cookie },
    });
    assert.equal(approvedRes.status, 200);
    assert.equal(approvedRes.headers.get("content-type"), "audio/wav");
    assert.equal(
      approvedRes.headers.get("cache-control"),
      "private, no-store, max-age=0"
    );
    assert.ok(Buffer.from(await approvedRes.arrayBuffer()).equals(approvedWav));

    const rangeRes = await fetch(`${origin}/api/media/synth-music-approved`, {
      headers: { cookie, range: "bytes=0-511" },
    });
    assert.equal(rangeRes.status, 206);
    assert.equal(rangeRes.headers.get("content-length"), "512");
    assert.ok(
      Buffer.from(await rangeRes.arrayBuffer()).equals(approvedWav.subarray(0, 512))
    );

    // Music record with consentConfirmed=true & hostingRightsConfirmed=false is strictly 404
    const consentOnlyRes = await fetch(`${origin}/api/media/synth-music-consent-only`, {
      headers: { cookie },
    });
    assert.equal(consentOnlyRes.status, 404);
  } finally {
    server.kill();
    await rm(tmpRoot, { recursive: true, force: true });
  }
}

async function run() {
  const ephemeralPassphrase = randomBytes(20).toString("base64url");
  const passphraseHash = await scryptHash(ephemeralPassphrase);
  const sessionSecret = randomBytes(32).toString("hex");

  await runActiveProductionSuite(ephemeralPassphrase, passphraseHash, sessionSecret);
  await runSyntheticRightsIsolationSuite(ephemeralPassphrase, passphraseHash, sessionSecret);

  console.log("ALL LIVE HTTP SOUNDTRACK SECURITY, AVAILABILITY & RIGHTS SUITES PASSED.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

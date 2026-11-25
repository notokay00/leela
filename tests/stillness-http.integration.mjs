import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash, randomBytes, scrypt } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const PORT_PROD = 3097;
const PORT_NEGATIVE = 3096;

const EXPECTED_15 = [
  { num: "01", width: 722, height: 957 },
  { num: "02", width: 1920, height: 1080 },
  { num: "03", width: 1080, height: 608 },
  { num: "04", width: 1920, height: 1080 },
  { num: "05", width: 1920, height: 1080 },
  { num: "06", width: 1080, height: 1909 },
  { num: "07", width: 1290, height: 2796 },
  { num: "08", width: 941, height: 1024 },
  { num: "09", width: 1080, height: 1919 },
  { num: "10", width: 1290, height: 2796 },
  { num: "11", width: 1290, height: 2796 },
  { num: "12", width: 1599, height: 899 },
  { num: "13", width: 1080, height: 608 },
  { num: "14", width: 1920, height: 1080 },
  { num: "15", width: 787, height: 708 },
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

function parseVp8DimensionsAndChunks(buf) {
  assert.ok(buf.length >= 30);
  assert.equal(buf.subarray(0, 4).toString("ascii"), "RIFF");
  assert.equal(buf.subarray(8, 12).toString("ascii"), "WEBP");

  const chunks = [];
  let width = null;
  let height = null;
  let offset = 12;
  while (offset + 8 <= buf.length) {
    const fourcc = buf.subarray(offset, offset + 4).toString("ascii");
    const size = buf.readUInt32LE(offset + 4);
    const dataStart = offset + 8;
    chunks.push(fourcc);
    if (
      fourcc === "VP8 " &&
      width === null &&
      dataStart + 10 <= buf.length &&
      buf[dataStart + 3] === 0x9d &&
      buf[dataStart + 4] === 0x01 &&
      buf[dataStart + 5] === 0x2a
    ) {
      width = buf.readUInt16LE(dataStart + 6) & 0x3fff;
      height = buf.readUInt16LE(dataStart + 8) & 0x3fff;
    }
    offset = dataStart + size + (size % 2);
  }
  return { chunks, width, height };
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
  const unlock = await fetch(`${origin}/api/auth/unlock`, {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify({ passphrase }),
  });
  assert.equal(unlock.status, 200);
  const cookie = (unlock.headers.get("set-cookie") ?? "").split(";")[0];
  assert.ok(cookie.startsWith("archive_session=v1."));
  return cookie;
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

async function createFallbackStillnessRoot() {
  const tmpRoot = await mkdtemp(path.join(os.tmpdir(), "leela-stillness-http-"));
  const dir = path.join(tmpRoot, "stillness");
  await mkdir(dir, { recursive: true });
  for (const item of EXPECTED_15) {
    const vp8Payload = Buffer.alloc(1024);
    vp8Payload[3] = 0x9d;
    vp8Payload[4] = 0x01;
    vp8Payload[5] = 0x2a;
    vp8Payload.writeUInt16LE(item.width & 0x3fff, 6);
    vp8Payload.writeUInt16LE(item.height & 0x3fff, 8);

    const buf = Buffer.alloc(12 + 8 + vp8Payload.length);
    buf.write("RIFF", 0, "ascii");
    buf.writeUInt32LE(buf.length - 8, 4);
    buf.write("WEBP", 8, "ascii");
    buf.write("VP8 ", 12, "ascii");
    buf.writeUInt32LE(vp8Payload.length, 16);
    vp8Payload.copy(buf, 20);
    await writeFile(path.join(dir, `stillness-${item.num}.webp`), buf);
  }
  return tmpRoot;
}

async function runActiveProductionStillnessSuite(
  passphrase,
  passphraseHash,
  sessionSecret,
  mediaRoot
) {
  const origin = `http://localhost:${PORT_PROD}`;
  const server = spawnNextStart(PORT_PROD, {
    APP_ORIGIN: origin,
    STORAGE_DRIVER: "local-fs",
    LOCAL_MEDIA_ROOT: mediaRoot,
    ARCHIVE_ENABLE_SYNTHETIC_TEST_FIXTURES: "0",
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

    // 1. Unauthenticated /archive/stillness redirects to / and Threshold leaks zero asset IDs
    const unauthRoom = await fetch(`${origin}/archive/stillness`, {
      redirect: "manual",
    });
    assert.equal(unauthRoom.status, 307);
    assert.equal(unauthRoom.headers.get("location"), "/");

    const thresholdHtml = await (await fetch(`${origin}/`)).text();
    assert.equal(thresholdHtml.includes("/api/media/arc-i-"), false);
    assert.equal(thresholdHtml.includes("stillness-01.webp"), false);

    // 2. Unauthenticated GET and HEAD across all 15 active Stillness IDs strictly return 401
    for (const item of EXPECTED_15) {
      const id = `arc-i-${item.num}`;
      const unauthGet = await fetch(`${origin}/api/media/${id}`);
      assert.equal(unauthGet.status, 401, `Expected 401 GET on ${id}`);
      assert.ok((unauthGet.headers.get("cache-control") ?? "").includes("no-store"));

      const unauthHead = await fetch(`${origin}/api/media/${id}`, {
        method: "HEAD",
      });
      assert.equal(unauthHead.status, 401, `Expected 401 HEAD on ${id}`);
    }

    // 3. Authenticated /archive/stillness renders all 15 photos in canonical order with count 15
    const cookie = await unlockSession(origin, passphrase);
    const roomRes = await fetch(`${origin}/archive/stillness`, {
      headers: { cookie },
    });
    assert.equal(roomRes.status, 200);
    const roomHtml = await roomRes.text();
    assert.ok(roomHtml.includes("STILLNESS · MOVEMENT I"));
    assert.ok(roomHtml.includes("STILLNESS · 15 photographs"));
    assert.equal(roomHtml.includes("AU/I"), false);
    assert.equal(roomHtml.includes("No photographs are available here yet."), false);
    assert.equal(roomHtml.includes(mediaRoot), false);
    assert.equal(roomHtml.includes("TEST FIXTURES"), false);

    let lastPos = -1;
    for (const item of EXPECTED_15) {
      const token = `/api/media/arc-i-${item.num}`;
      const pos = roomHtml.indexOf(token);
      assert.ok(pos > lastPos, `Missing or out-of-order Stillness URL ${token}`);
      lastPos = pos;
    }

    // 4. Authenticated HEAD & full GET across ALL 15 active production IDs arc-i-01..15
    const sizes = new Map();
    for (const item of EXPECTED_15) {
      const id = `arc-i-${item.num}`;
      const diskPath = path.join(mediaRoot, "stillness", `stillness-${item.num}.webp`);
      const diskBytes = readFileSync(diskPath);
      const diskSha = createHash("sha256").update(diskBytes).digest("hex");

      const headRes = await fetch(`${origin}/api/media/${id}`, {
        method: "HEAD",
        headers: { cookie },
      });
      assert.equal(headRes.status, 200, `HEAD failed for ${id}`);
      assert.equal(headRes.headers.get("content-type"), "image/webp");
      assert.equal(headRes.headers.get("accept-ranges"), "bytes");
      assert.equal(
        headRes.headers.get("cache-control"),
        "private, no-store, max-age=0"
      );
      assert.equal(headRes.headers.get("x-content-type-options"), "nosniff");
      assert.equal(
        headRes.headers.get("x-robots-tag"),
        "noindex, nofollow, noarchive, noimageindex"
      );
      assert.equal(headRes.headers.get("content-length"), String(diskBytes.length));
      assert.equal((await headRes.arrayBuffer()).byteLength, 0);
      sizes.set(id, diskBytes.length);

      const getRes = await fetch(`${origin}/api/media/${id}`, {
        headers: { cookie },
      });
      assert.equal(getRes.status, 200, `GET failed for ${id}`);
      assert.equal(getRes.headers.get("content-type"), "image/webp");
      assert.equal(
        getRes.headers.get("cache-control"),
        "private, no-store, max-age=0"
      );
      assert.equal(getRes.headers.get("x-content-type-options"), "nosniff");
      const received = Buffer.from(await getRes.arrayBuffer());
      assert.equal(received.length, diskBytes.length);
      assert.equal(
        createHash("sha256").update(received).digest("hex"),
        diskSha,
        `Byte/SHA mismatch for ${id}`
      );

      const parsed = parseVp8DimensionsAndChunks(received);
      assert.equal(parsed.width, item.width, `Unexpected width for ${id}`);
      assert.equal(parsed.height, item.height, `Unexpected height for ${id}`);
      assert.equal(parsed.chunks.includes("EXIF"), false, `EXIF found in ${id}`);
      assert.equal(parsed.chunks.includes("XMP "), false, `XMP found in ${id}`);
      assert.equal(parsed.chunks.includes("ICCP"), false, `ICCP found in ${id}`);
    }

    // 5. Verify 206 single-range, suffix-range, and 416 unsatisfiable range on rotated & upright active IDs
    for (const id of ["arc-i-02", "arc-i-07", "arc-i-12", "arc-i-14"]) {
      const totalSize = sizes.get(id);

      const startRange = await fetch(`${origin}/api/media/${id}`, {
        headers: { cookie, range: "bytes=0-1023" },
      });
      assert.equal(startRange.status, 206);
      assert.equal(
        startRange.headers.get("content-range"),
        `bytes 0-1023/${totalSize}`
      );
      assert.equal(startRange.headers.get("content-length"), "1024");
      const slice = Buffer.from(await startRange.arrayBuffer());
      assert.equal(slice.subarray(0, 4).toString("ascii"), "RIFF");
      assert.equal(slice.subarray(8, 12).toString("ascii"), "WEBP");

      const suffixRange = await fetch(`${origin}/api/media/${id}`, {
        headers: { cookie, range: "bytes=-256" },
      });
      assert.equal(suffixRange.status, 206);
      assert.equal(
        suffixRange.headers.get("content-range"),
        `bytes ${totalSize - 256}-${totalSize - 1}/${totalSize}`
      );
      assert.equal((await suffixRange.arrayBuffer()).byteLength, 256);

      const unsatRange = await fetch(`${origin}/api/media/${id}`, {
        headers: { cookie, range: `bytes=${totalSize + 10}-` },
      });
      assert.equal(unsatRange.status, 416);
      assert.equal(unsatRange.headers.get("content-range"), `bytes */${totalSize}`);
    }

    // 6. Invalid IDs, traversal attempts, and withheld personal film all return uniform 404
    const baseline404 = await (
      await fetch(`${origin}/api/media/arc-i-99`, { headers: { cookie } })
    ).text();

    for (const badPath of [
      "/api/media/arc-i-00",
      "/api/media/arc-i-16",
      "/api/media/arc-i-01.webp",
      "/api/media/stillness-01.webp",
      "/api/media/stillness/stillness-01.webp",
      "/api/media/..%2Fstillness%2Fstillness-01.webp",
      "/api/media/arc-iii-01-film",
    ]) {
      const res = await fetch(`${origin}${badPath}`, { headers: { cookie } });
      assert.equal(res.status, 404, `Expected 404 for ${badPath}`);
      assert.equal(await res.text(), baseline404);
    }
  } finally {
    server.kill();
  }
}

async function runNegativeConsentEnforcementSuite(
  passphrase,
  passphraseHash,
  sessionSecret,
  mediaRoot
) {
  const origin = `http://localhost:${PORT_NEGATIVE}`;
  const manifestTmp = await mkdtemp(path.join(os.tmpdir(), "leela-stillness-neg-"));
  const manifestPath = path.join(manifestTmp, "stillness-neg-manifest.json");

  const manifest = [
    {
      id: "test-stillness-unconsented",
      storageRelativePath: "stillness/stillness-01.webp",
      mimeType: "image/webp",
      downloadFilename: "test-stillness-unconsented.webp",
      sensitivity: "high",
      publishStatus: "ready",
      consentConfirmed: false,
      assetCategory: "personal-media",
    },
    {
      id: "test-stillness-withheld",
      storageRelativePath: "stillness/stillness-02.webp",
      mimeType: "image/webp",
      downloadFilename: "test-stillness-withheld.webp",
      sensitivity: "high",
      publishStatus: "withheld",
      consentConfirmed: true,
      assetCategory: "personal-media",
    },
  ];
  await writeFile(manifestPath, JSON.stringify(manifest), "utf8");

  const server = spawnNextStart(PORT_NEGATIVE, {
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

    const cookie = await unlockSession(origin, passphrase);
    const baseline404 = await (
      await fetch(`${origin}/api/media/nonexistent-neg-99`, { headers: { cookie } })
    ).text();

    for (const id of [
      "test-stillness-unconsented",
      "test-stillness-withheld",
      "arc-iii-01-film",
    ]) {
      const res = await fetch(`${origin}/api/media/${id}`, {
        headers: { cookie },
      });
      assert.equal(res.status, 404, `Expected 404 for ${id}`);
      assert.equal(await res.text(), baseline404);
    }
  } finally {
    server.kill();
    await rm(manifestTmp, { recursive: true, force: true });
  }
}

async function run() {
  const ephemeralPassphrase = randomBytes(20).toString("base64url");
  const passphraseHash = await scryptHash(ephemeralPassphrase);
  const sessionSecret = randomBytes(32).toString("hex");

  let tempRoot = null;
  const stagedRoot = process.env.LOCAL_MEDIA_ROOT || "D:\\leela-archive-media";
  let mediaRoot = stagedRoot;
  if (!existsSync(path.join(stagedRoot, "stillness", "stillness-15.webp"))) {
    tempRoot = await createFallbackStillnessRoot();
    mediaRoot = tempRoot;
  }

  try {
    await runActiveProductionStillnessSuite(
      ephemeralPassphrase,
      passphraseHash,
      sessionSecret,
      mediaRoot
    );
    await runNegativeConsentEnforcementSuite(
      ephemeralPassphrase,
      passphraseHash,
      sessionSecret,
      mediaRoot
    );

    console.log(
      "ALL LIVE HTTP STILLNESS 15-PHOTO ACTIVE DELIVERY & CONSENT-ENFORCEMENT SUITES PASSED."
    );
  } finally {
    if (tempRoot) {
      await rm(tempRoot, { recursive: true, force: true });
    }
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes, scrypt } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const PORT = 3097;
const ORIGIN = `http://localhost:${PORT}`;

const ALL_15_IDS = Array.from(
  { length: 15 },
  (_, idx) => `arc-i-${String(idx + 1).padStart(2, "0")}`
);

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

async function createFallbackStillnessRoot() {
  const tmpRoot = await mkdtemp(path.join(os.tmpdir(), "leela-stillness-http-"));
  const dir = path.join(tmpRoot, "stillness");
  await mkdir(dir, { recursive: true });
  for (let i = 1; i <= 15; i++) {
    const padded = String(i).padStart(2, "0");
    const buf = Buffer.alloc(2048);
    buf.write("RIFF", 0, "ascii");
    buf.writeUInt32LE(buf.length - 8, 4);
    buf.write("WEBP", 8, "ascii");
    buf.write("VP8 ", 12, "ascii");
    await writeFile(path.join(dir, `stillness-${padded}.webp`), buf);
  }
  return tmpRoot;
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
      ARCHIVE_ENABLE_SYNTHETIC_TEST_FIXTURES: "0",
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

    // 1. Unauthenticated /archive/stillness redirects cleanly and leaks zero photo URLs
    const unauthRoom = await fetch(`${ORIGIN}/archive/stillness`, {
      redirect: "manual",
    });
    assert.equal(unauthRoom.status, 307);
    assert.equal(unauthRoom.headers.get("location"), "/");

    const thresholdHtml = await (await fetch(`${ORIGIN}/`)).text();
    assert.equal(thresholdHtml.includes("/api/media/arc-i-"), false);
    assert.equal(thresholdHtml.includes("stillness-01.webp"), false);

    // 2. Unauthenticated GET and HEAD across all 15 Stillness photo endpoints return 401
    for (const id of ALL_15_IDS) {
      const unauthGet = await fetch(`${ORIGIN}/api/media/${id}`);
      assert.equal(unauthGet.status, 401, `Expected 401 GET on ${id}`);
      assert.ok((unauthGet.headers.get("cache-control") ?? "").includes("no-store"));

      const unauthHead = await fetch(`${ORIGIN}/api/media/${id}`, {
        method: "HEAD",
      });
      assert.equal(unauthHead.status, 401, `Expected 401 HEAD on ${id}`);
    }

    // 3. Unlock session via POST /api/auth/unlock
    const unlock = await fetch(`${ORIGIN}/api/auth/unlock`, {
      method: "POST",
      headers: { origin: ORIGIN, "content-type": "application/json" },
      body: JSON.stringify({ passphrase: ephemeralPassphrase }),
    });
    assert.equal(unlock.status, 200);
    const cookie = (unlock.headers.get("set-cookie") ?? "").split(";")[0];
    assert.ok(cookie.startsWith("archive_session=v1."));

    // 4. Authenticated /archive/stillness renders all 15 opaque photo routes without exposing storage paths
    const roomRes = await fetch(`${ORIGIN}/archive/stillness`, {
      headers: { cookie },
    });
    assert.equal(roomRes.status, 200);
    const roomHtml = await roomRes.text();
    assert.ok(roomHtml.includes("AU/I · 15 photographs"));
    for (let i = 1; i <= 15; i++) {
      const padded = String(i).padStart(2, "0");
      assert.ok(roomHtml.includes(`/api/media/arc-i-${padded}`), `Missing src for arc-i-${padded}`);
      assert.ok(roomHtml.includes(`AU/I-${padded}`), `Missing catalogId AU/I-${padded}`);
      assert.equal(
        roomHtml.includes(`stillness/stillness-${padded}.webp`),
        false,
        "Client HTML must never expose internal storage path"
      );
    }
    assert.equal(roomHtml.includes(mediaRoot), false, "Client HTML must never expose storage root");

    // 5. Authenticated HEAD across all 15 photographs verifies image/webp, no-store, Accept-Ranges, and non-zero size
    const sizes = new Map();
    for (const id of ALL_15_IDS) {
      const headRes = await fetch(`${ORIGIN}/api/media/${id}`, {
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
      const len = Number(headRes.headers.get("content-length"));
      assert.ok(Number.isSafeInteger(len) && len >= 1024, `Invalid length for ${id}`);
      assert.equal((await headRes.arrayBuffer()).byteLength, 0);
      sizes.set(id, len);
    }

    // 6. Authenticated full GET (200), satisfiable Range (206), suffix Range (206), and unsatisfiable Range (416)
    for (const id of ["arc-i-01", "arc-i-07", "arc-i-15"]) {
      const totalSize = sizes.get(id);

      const fullRes = await fetch(`${ORIGIN}/api/media/${id}`, {
        headers: { cookie },
      });
      assert.equal(fullRes.status, 200);
      assert.equal(fullRes.headers.get("content-type"), "image/webp");
      assert.equal(fullRes.headers.get("content-length"), String(totalSize));
      const fullBytes = Buffer.from(await fullRes.arrayBuffer());
      assert.equal(fullBytes.length, totalSize);
      assert.equal(fullBytes.subarray(0, 4).toString("ascii"), "RIFF");
      assert.equal(fullBytes.subarray(8, 12).toString("ascii"), "WEBP");

      const rangeRes = await fetch(`${ORIGIN}/api/media/${id}`, {
        headers: { cookie, range: "bytes=0-1023" },
      });
      assert.equal(rangeRes.status, 206);
      assert.equal(rangeRes.headers.get("content-type"), "image/webp");
      assert.equal(
        rangeRes.headers.get("content-range"),
        `bytes 0-1023/${totalSize}`
      );
      assert.equal(rangeRes.headers.get("content-length"), "1024");
      const slice = Buffer.from(await rangeRes.arrayBuffer());
      assert.ok(slice.equals(fullBytes.subarray(0, 1024)));

      const suffixRes = await fetch(`${ORIGIN}/api/media/${id}`, {
        headers: { cookie, range: "bytes=-256" },
      });
      assert.equal(suffixRes.status, 206);
      assert.equal(
        suffixRes.headers.get("content-range"),
        `bytes ${totalSize - 256}-${totalSize - 1}/${totalSize}`
      );
      assert.ok(Buffer.from(await suffixRes.arrayBuffer()).equals(fullBytes.subarray(totalSize - 256)));

      const unsatRes = await fetch(`${ORIGIN}/api/media/${id}`, {
        headers: { cookie, range: `bytes=${totalSize + 10}-` },
      });
      assert.equal(unsatRes.status, 416);
      assert.equal(unsatRes.headers.get("content-range"), `bytes */${totalSize}`);
    }

    // 7. Invalid identifiers, direct filenames, traversal attempts, and withheld personal video all return uniform 404
    const baseline404 = await (
      await fetch(`${ORIGIN}/api/media/arc-i-16`, { headers: { cookie } })
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
      const res = await fetch(`${ORIGIN}${badPath}`, { headers: { cookie } });
      assert.equal(res.status, 404, `Expected 404 for ${badPath}`);
      assert.equal(await res.text(), baseline404);
    }

    console.log("ALL 7 LIVE HTTP STILLNESS PHOTOGRAPH SECURITY, RANGE & ROOM SUITES PASSED.");
  } finally {
    server.kill();
    if (tempRoot) {
      await rm(tempRoot, { recursive: true, force: true });
    }
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

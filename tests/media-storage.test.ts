import assert from "node:assert/strict";
import {
  mkdir,
  mkdtemp,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { CORRESPONDENCE_ARTIFACTS } from "../content/artifacts/correspondence.ts";
import { VOICES_AND_FILM_ARTIFACTS } from "../content/artifacts/voices-and-film.ts";
import { parseSingleByteRange } from "../lib/http/range.ts";
import {
  buildMediaAllowlist,
  getRegisteredArchiveMediaRecords,
  isValidOpaqueAssetId,
  resolveApprovedMediaAsset,
  type MediaAssetRecord,
} from "../lib/media/registry.ts";
import { LocalFsStorageAdapter } from "../lib/storage/local-fs.ts";
import {
  isPathStrictlyInside,
  resolveSafeLocalFile,
  validateRelativeStoragePath,
} from "../lib/storage/path-safety.ts";
import { VercelPrivateBlobStorageAdapter } from "../lib/storage/vercel-blob.ts";

describe("Consent defaults and strict opaque media allowlist", () => {
  it("keeps all unapproved personal media artifacts withheld while respecting approved Correspondence text publication", () => {
    // All 23 first-edition Correspondence poems are explicitly approved by the author
    assert.equal(CORRESPONDENCE_ARTIFACTS.length, 23);
    for (const artifact of CORRESPONDENCE_ARTIFACTS) {
      assert.equal(artifact.publishStatus, "ready");
      assert.equal(artifact.consentConfirmed, true);
    }

    // All personal media (video/audio) remain strictly withheld and unconsented
    for (const artifact of VOICES_AND_FILM_ARTIFACTS) {
      assert.equal(artifact.publishStatus, "withheld");
      assert.equal(artifact.consentConfirmed, false);
    }

    const mediaRecords = getRegisteredArchiveMediaRecords();
    const personalRecords = mediaRecords.filter(
      (record) => record.assetCategory !== "music-soundtrack"
    );
    const stillnessPhotoRecords = personalRecords.filter((record) =>
      record.id.startsWith("arc-i-")
    );
    const voicesAndFilmRecords = personalRecords.filter(
      (record) => !record.id.startsWith("arc-i-")
    );
    const soundtrackRecords = mediaRecords.filter(
      (record) => record.assetCategory === "music-soundtrack"
    );

    // Voices & Film video remains strictly withheld & unconsented; personal-media never uses hostingRightsConfirmed
    assert.equal(personalRecords.length, 16);
    assert.equal(voicesAndFilmRecords.length, 1);
    for (const record of voicesAndFilmRecords) {
      assert.equal(record.id, "arc-iii-01-film");
      assert.equal(record.publishStatus, "withheld");
      assert.equal(record.consentConfirmed, false);
      assert.equal(record.hostingRightsConfirmed, undefined);
      assert.equal(resolveApprovedMediaAsset(record.id), null);
    }

    // All 15 Stillness photographs have explicitly confirmed personal-media consent (distinct from music hosting rights)
    assert.equal(stillnessPhotoRecords.length, 15);
    for (let i = 0; i < stillnessPhotoRecords.length; i++) {
      const record = stillnessPhotoRecords[i];
      const padded = String(i + 1).padStart(2, "0");
      assert.equal(record.id, `arc-i-${padded}`);
      assert.equal(record.storageRelativePath, `stillness/stillness-${padded}.webp`);
      assert.equal(record.mimeType, "image/webp");
      assert.equal(record.sensitivity, "high");
      assert.equal(record.assetCategory, "personal-media");
      assert.equal(record.publishStatus, "ready");
      assert.equal(record.consentConfirmed, true);
      assert.equal(record.hostingRightsConfirmed, undefined);
      const resolved = resolveApprovedMediaAsset(record.id);
      assert.ok(resolved !== null);
      assert.equal(resolved.id, record.id);
      assert.equal(resolved.mimeType, "image/webp");
    }

    // All 24 approved soundtracks use music-soundtrack hosting rights while keeping personal consentConfirmed=false
    assert.equal(soundtrackRecords.length, 24);
    for (const record of soundtrackRecords) {
      assert.equal(record.publishStatus, "ready");
      assert.equal(record.hostingRightsConfirmed, true);
      assert.equal(record.consentConfirmed, false);
      assert.equal(record.sensitivity, "high");
      assert.ok(record.storageRelativePath.startsWith("soundtracks/"));
      if (record.id === "arc-snd-poem-022") {
        assert.equal(record.mimeType, "audio/mp4");
        assert.equal(record.storageRelativePath, "soundtracks/arc-snd-poem-022.m4a");
      } else {
        assert.equal(record.mimeType, "audio/mpeg");
        assert.ok(record.storageRelativePath.endsWith(".mp3"));
      }
    }

    // Active production allowlist contains the 24 approved soundtracks + 15 consented Stillness photographs (39 total)
    // and ZERO unconsented personal assets (arc-iii-01-film remains strictly excluded)
    const allowlist = buildMediaAllowlist(mediaRecords);
    assert.equal(allowlist.size, 39);
    assert.equal(resolveApprovedMediaAsset("arc-iii-01-film"), null);
    assert.equal(resolveApprovedMediaAsset("arc-i-01")?.mimeType, "image/webp");
    assert.equal(resolveApprovedMediaAsset("arc-i-15")?.mimeType, "image/webp");
    assert.equal(resolveApprovedMediaAsset("arc-score-aranjuez")?.mimeType, "audio/mpeg");
    assert.equal(resolveApprovedMediaAsset("arc-snd-poem-022")?.mimeType, "audio/mp4");
  });

  it("allows only explicitly ready + consentConfirmed opaque IDs", () => {
    const records: MediaAssetRecord[] = [
      {
        id: "synth-approved",
        storageRelativePath: "video/synth.mp4",
        mimeType: "video/mp4",
        downloadFilename: "synth.mp4",
        sensitivity: "high",
        publishStatus: "ready",
        consentConfirmed: true,
      },
      {
        id: "synth-no-consent",
        storageRelativePath: "video/no-consent.mp4",
        mimeType: "video/mp4",
        downloadFilename: "no-consent.mp4",
        sensitivity: "high",
        publishStatus: "ready",
        consentConfirmed: false,
      },
      {
        id: "synth-withheld",
        storageRelativePath: "video/withheld.mp4",
        mimeType: "video/mp4",
        downloadFilename: "withheld.mp4",
        sensitivity: "high",
        publishStatus: "withheld",
        consentConfirmed: true,
      },
    ];

    assert.equal(
      resolveApprovedMediaAsset("synth-approved", { records })?.id,
      "synth-approved"
    );
    assert.equal(
      resolveApprovedMediaAsset("synth-no-consent", { records }),
      null
    );
    assert.equal(
      resolveApprovedMediaAsset("synth-withheld", { records }),
      null
    );
    assert.equal(resolveApprovedMediaAsset("unknown-id", { records }), null);

    // Reject path-like or traversal identifiers
    assert.equal(isValidOpaqueAssetId("../secret"), false);
    assert.equal(isValidOpaqueAssetId("video/synth.mp4"), false);
    assert.equal(isValidOpaqueAssetId("C:\\secret"), false);
    assert.equal(isValidOpaqueAssetId("synth%2fapproved"), false);
  });
});

describe("Filesystem path security, Windows awareness, and symlink/junction protection", () => {
  it("prevents sibling-prefix bypasses and cross-drive escapes", () => {
    assert.equal(
      isPathStrictlyInside("D:\\media", "D:\\media\\video\\a.mp4", "win32"),
      true
    );
    // Sibling prefix attack that naive `.startsWith()` misses
    assert.equal(
      isPathStrictlyInside("D:\\media", "D:\\media-evil\\a.mp4", "win32"),
      false
    );
    assert.equal(isPathStrictlyInside("D:\\media", "D:\\media", "win32"), false);
    assert.equal(
      isPathStrictlyInside("D:\\media", "C:\\media\\a.mp4", "win32"),
      false
    );
    assert.equal(
      isPathStrictlyInside("/srv/media", "/srv/media-evil/a.mp4", "linux"),
      false
    );
  });

  it("rejects traversal, encoded traversal, Windows drives, backslashes, ADS, and reserved names", () => {
    const invalidPaths = [
      "",
      "../secret.mp4",
      "video/../../secret.mp4",
      "video/%2e%2e/secret.mp4",
      "video/%2fsecret.mp4",
      "video\\file.mp4",
      "C:file.mp4",
      "C:/Windows/win.ini",
      "/etc/passwd",
      "//server/share/file.mp4",
      "video/file.mp4:ads",
      "video/CON.mp4",
      "video/nul",
      "video/file.mp4\0.png",
      "video//file.mp4",
      "video/./file.mp4",
    ];

    for (const bad of invalidPaths) {
      assert.equal(
        validateRelativeStoragePath(bad),
        null,
        `Expected path to be rejected: ${bad}`
      );
    }

    assert.deepEqual(validateRelativeStoragePath("video/synth-01.mp4"), [
      "video",
      "synth-01.mp4",
    ]);
  });

  it("blocks storage roots inside the repository and blocks symlink / Windows junction escapes", async () => {
    const baseTmp = await mkdtemp(path.join(os.tmpdir(), "leela-media-sec-"));
    const storageRoot = path.join(baseTmp, "storage-root");
    const outsideRoot = path.join(baseTmp, "outside-secret");

    try {
      await mkdir(path.join(storageRoot, "video"), { recursive: true });
      await mkdir(outsideRoot, { recursive: true });

      const validFile = path.join(storageRoot, "video", "fixture.mp4");
      const outsideFile = path.join(outsideRoot, "secret.txt");
      await writeFile(validFile, Buffer.from("synthetic-fixture-bytes"));
      await writeFile(outsideFile, Buffer.from("outside-root-secret"));

      // Valid file inside isolated external storage root succeeds
      const resolved = await resolveSafeLocalFile(
        storageRoot,
        "video/fixture.mp4"
      );
      assert.ok(resolved !== null);
      assert.equal(resolved.size, 23);

      // Storage root inside the repository (or public/) is rejected
      const insideRepoRoot = path.join(process.cwd(), "public");
      assert.equal(
        await resolveSafeLocalFile(insideRepoRoot, "fixture.mp4"),
        null
      );

      // Directory junction (Windows) or directory symlink (POSIX) escape MUST be blocked
      const junctionDir = path.join(storageRoot, "escaped-dir");
      const linkType = process.platform === "win32" ? "junction" : "dir";
      let realJunctionCreated = false;
      try {
        await symlink(outsideRoot, junctionDir, linkType);
        realJunctionCreated = true;
      } catch {
        // Sandboxed environments may disallow symlink/junction creation syscall.
      }
      if (realJunctionCreated) {
        assert.equal(
          await resolveSafeLocalFile(storageRoot, "escaped-dir/secret.txt"),
          null
        );
      }

      // Direct file symlink escape (if OS privileges allow creating file symlinks)
      const fileLink = path.join(storageRoot, "video", "escaped-file.mp4");
      let fileSymlinkCreated = false;
      try {
        await symlink(outsideFile, fileLink, "file");
        fileSymlinkCreated = true;
      } catch {
        // Non-elevated Windows environments may restrict file symlinks.
      }
      if (fileSymlinkCreated) {
        assert.equal(
          await resolveSafeLocalFile(storageRoot, "video/escaped-file.mp4"),
          null
        );
      }

      // Deterministic symlink, directory-junction/reparse-point, and realpath escape tests
      // via injected fsOps (guarantees verification even inside restricted sandboxes)
      const fakeDirStat = {
        isSymbolicLink: () => false,
        isDirectory: () => true,
        isFile: () => false,
        size: 0,
        mtime: new Date(),
      } as unknown as Awaited<ReturnType<typeof import("node:fs/promises").lstat>>;
      const fakeLinkStat = {
        isSymbolicLink: () => true,
        isDirectory: () => false,
        isFile: () => false,
        size: 0,
        mtime: new Date(),
      } as unknown as Awaited<ReturnType<typeof import("node:fs/promises").lstat>>;
      const fakeFileStat = {
        isSymbolicLink: () => false,
        isDirectory: () => false,
        isFile: () => true,
        size: 100,
        mtime: new Date(),
      } as unknown as Awaited<ReturnType<typeof import("node:fs/promises").lstat>>;

      // 1) Intermediate directory junction / reparse point rejected by lstat walk
      const junctionBlocked = await resolveSafeLocalFile(
        storageRoot,
        "junction-dir/secret.mp4",
        {
          fsOps: {
            realpath: async (p: unknown) => String(p),
            lstat: async (p: unknown) =>
              String(p).endsWith("junction-dir") ? fakeLinkStat : fakeFileStat,
          } as Parameters<typeof resolveSafeLocalFile>[2] extends {
            fsOps?: infer F;
          }
            ? NonNullable<F>
            : never,
        }
      );
      assert.equal(junctionBlocked, null);

      // 2) Direct file symlink rejected by lstat walk
      const fileSymlinkBlocked = await resolveSafeLocalFile(
        storageRoot,
        "video/link.mp4",
        {
          fsOps: {
            realpath: async (p: unknown) => String(p),
            lstat: async (p: unknown) =>
              String(p).endsWith("link.mp4") ? fakeLinkStat : fakeDirStat,
          } as Parameters<typeof resolveSafeLocalFile>[2] extends {
            fsOps?: infer F;
          }
            ? NonNullable<F>
            : never,
        }
      );
      assert.equal(fileSymlinkBlocked, null);

      // 3) Canonical realpath escape rejected even if lstat reports regular entries
      const canonicalEscapeBlocked = await resolveSafeLocalFile(
        storageRoot,
        "video/escaped.mp4",
        {
          fsOps: {
            realpath: async (p: unknown) =>
              String(p).endsWith("escaped.mp4") ? outsideFile : String(p),
            lstat: async (p: unknown) =>
              String(p).endsWith("escaped.mp4") ? fakeFileStat : fakeDirStat,
          } as Parameters<typeof resolveSafeLocalFile>[2] extends {
            fsOps?: infer F;
          }
            ? NonNullable<F>
            : never,
        }
      );
      assert.equal(canonicalEscapeBlocked, null);

      // Stream open + explicit close / cancel cleanup works cleanly
      const adapter = new LocalFsStorageAdapter(storageRoot);
      const handle = await adapter.openStream("video/fixture.mp4", {
        start: 0,
        end: 8,
      });
      const reader = handle.stream.getReader();
      const first = await reader.read();
      assert.equal(first.done, false);
      assert.equal(
        new TextDecoder().decode(first.value),
        "synthetic"
      );
      await reader.cancel();
      handle.close();
    } finally {
      await rm(baseTmp, { recursive: true, force: true });
    }
  });

  it("implements VercelPrivateBlobStorageAdapter with private access, byte ranges, path safety, and abort cleanup", async () => {
    const payload = Buffer.from("0123456789abcdefghijklmnopqrstuvwxyz");
    const calls: {
      head: Array<{ pathname: string; options: unknown }>;
      get: Array<{ pathname: string; options: unknown }>;
    } = { head: [], get: [] };
    let lastAbortSignal: AbortSignal | undefined;
    let upstreamCancelled = false;

    const adapter = new VercelPrivateBlobStorageAdapter({
      storeId: "store_test_private",
      blobOps: {
        head: async (pathname, options) => {
          calls.head.push({ pathname, options });
          if (pathname === "soundtracks/missing.mp3") {
            const notFound = new Error("Not found");
            notFound.name = "BlobNotFoundError";
            throw notFound;
          }
          return {
            size: payload.length,
            etag: '"etag-private-1"',
            uploadedAt: new Date("2026-11-24T00:00:00.000Z"),
          };
        },
        get: async (pathname, options) => {
          calls.get.push({ pathname, options });
          lastAbortSignal = options.abortSignal;
          if (pathname === "soundtracks/missing.mp3") {
            return null;
          }
          const rangeHeader = options.headers?.Range;
          let slice = payload;
          const responseHeaders = new Headers();
          if (rangeHeader) {
            const match = /^bytes=(\d+)-(\d+)$/.exec(rangeHeader);
            assert.ok(match);
            const start = Number(match[1]);
            const end = Number(match[2]);
            slice = payload.subarray(start, end + 1);
            responseHeaders.set(
              "content-range",
              `bytes ${start}-${end}/${payload.length}`
            );
          }

          if (pathname === "soundtracks/range-mismatch.mp3") {
            responseHeaders.delete("content-range");
          }

          const stream = new ReadableStream<Uint8Array>({
            start(controller) {
              controller.enqueue(new Uint8Array(slice.subarray(0, 4)));
              if (slice.length > 4) {
                controller.enqueue(new Uint8Array(slice.subarray(4)));
              }
              controller.close();
            },
            cancel() {
              upstreamCancelled = true;
            },
          });

          return {
            statusCode: 200,
            stream,
            headers: responseHeaders,
          };
        },
      },
    });

    assert.equal(adapter.driverName, "vercel-private-blob");
    assert.equal(adapter.supportsByteRanges, true);

    // Reject invalid/traversal keys before hitting Blob SDK
    assert.equal(await adapter.stat("../escape.mp3", "audio/mpeg"), null);
    await assert.rejects(() => adapter.openStream("soundtracks/../../etc/passwd"));
    assert.equal(calls.head.length, 0);
    assert.equal(calls.get.length, 0);

    // stat() enforces allowlist MIME and maps BlobNotFoundError to null
    const stat = await adapter.stat("soundtracks/arc-snd-poem-022.m4a", "audio/mp4");
    assert.ok(stat !== null);
    assert.equal(stat.size, payload.length);
    assert.equal(stat.contentType, "audio/mp4");
    assert.equal(stat.etag, '"etag-private-1"');
    assert.equal(
      await adapter.stat("soundtracks/missing.mp3", "audio/mpeg"),
      null
    );

    // Full private stream (no Range header)
    const fullHandle = await adapter.openStream("soundtracks/arc-score-aranjuez.mp3");
    const fullChunks: Uint8Array[] = [];
    const fullReader = fullHandle.stream.getReader();
    while (true) {
      const next = await fullReader.read();
      if (next.done) break;
      fullChunks.push(next.value);
    }
    assert.ok(Buffer.concat(fullChunks).equals(payload));
    const fullOpts = calls.get[0]?.options as {
      access: string;
      headers?: Record<string, string>;
      token?: string;
      storeId?: string;
    };
    assert.equal(fullOpts.access, "private");
    assert.equal(fullOpts.headers, undefined);
    assert.equal(fullOpts.storeId, "store_test_private");
    assert.equal(fullOpts.token, undefined);

    // Ranged private stream (206) sends exact RFC 9110 Range header and validates Content-Range
    const rangeHandle = await adapter.openStream(
      "soundtracks/arc-snd-poem-022.m4a",
      { start: 10, end: 19 }
    );
    const rangeChunks: Uint8Array[] = [];
    const rangeReader = rangeHandle.stream.getReader();
    while (true) {
      const next = await rangeReader.read();
      if (next.done) break;
      rangeChunks.push(next.value);
    }
    assert.equal(Buffer.concat(rangeChunks).toString("utf8"), "abcdefghij");
    const rangeOpts = calls.get[1]?.options as {
      access: string;
      headers?: Record<string, string>;
    };
    assert.equal(rangeOpts.access, "private");
    assert.equal(rangeOpts.headers?.Range, "bytes=10-19");

    // Upstream missing Content-Range on ranged fetch is rejected safely
    await assert.rejects(() =>
      adapter.openStream("soundtracks/range-mismatch.mp3", { start: 0, end: 5 })
    );

    // Closing or cancelling stream aborts upstream AbortSignal and cancels reader
    upstreamCancelled = false;
    const cancelHandle = await adapter.openStream("soundtracks/arc-score-aranjuez.mp3");
    const cancelReader = cancelHandle.stream.getReader();
    const firstChunk = await cancelReader.read();
    assert.equal(firstChunk.done, false);
    assert.equal(lastAbortSignal?.aborted, false);
    cancelHandle.close();
    assert.equal(lastAbortSignal?.aborted, true);
    await cancelReader.cancel().catch(() => {});
    assert.equal(upstreamCancelled, true);
  });
});

describe("RFC 9110 single-byte-range parser semantics", () => {
  it("handles none, satisfiable, unsatisfiable, malformed, multi-range, and unsupported units", () => {
    // No Range -> 200
    assert.deepEqual(parseSingleByteRange(null, 1000), { kind: "none" });
    assert.deepEqual(parseSingleByteRange("", 1000), { kind: "none" });

    // Standard start-end -> 206
    assert.deepEqual(parseSingleByteRange("bytes=0-99", 1000), {
      kind: "satisfiable",
      start: 0,
      end: 99,
      length: 100,
    });

    // End beyond file size clamped to totalSize - 1 -> 206
    assert.deepEqual(parseSingleByteRange("bytes=900-5000", 1000), {
      kind: "satisfiable",
      start: 900,
      end: 999,
      length: 100,
    });

    // Open-ended -> 206
    assert.deepEqual(parseSingleByteRange("bytes=950-", 1000), {
      kind: "satisfiable",
      start: 950,
      end: 999,
      length: 50,
    });

    // Suffix -> 206
    assert.deepEqual(parseSingleByteRange("bytes=-250", 1000), {
      kind: "satisfiable",
      start: 750,
      end: 999,
      length: 250,
    });

    // Suffix larger than file clamped to entire file -> 206
    assert.deepEqual(parseSingleByteRange("bytes=-5000", 1000), {
      kind: "satisfiable",
      start: 0,
      end: 999,
      length: 1000,
    });

    // Valid syntax but unsatisfiable -> 416
    assert.deepEqual(parseSingleByteRange("bytes=1000-", 1000), {
      kind: "unsatisfiable",
      totalSize: 1000,
    });
    assert.deepEqual(parseSingleByteRange("bytes=1000-1500", 1000), {
      kind: "unsatisfiable",
      totalSize: 1000,
    });
    assert.deepEqual(parseSingleByteRange("bytes=-0", 1000), {
      kind: "unsatisfiable",
      totalSize: 1000,
    });
    assert.deepEqual(parseSingleByteRange("bytes=0-0", 0), {
      kind: "unsatisfiable",
      totalSize: 0,
    });

    // Malformed, reversed, multiple ranges, and unsupported units -> ignore (200)
    assert.deepEqual(parseSingleByteRange("bytes=abc-def", 1000), {
      kind: "ignore",
    });
    assert.deepEqual(parseSingleByteRange("bytes=500-100", 1000), {
      kind: "ignore",
    });
    assert.deepEqual(parseSingleByteRange("bytes=-", 1000), {
      kind: "ignore",
    });
    assert.deepEqual(parseSingleByteRange("bytes=0-10, 20-30", 1000), {
      kind: "ignore",
    });
    assert.deepEqual(parseSingleByteRange("items=0-5", 1000), {
      kind: "ignore",
    });
  });
});

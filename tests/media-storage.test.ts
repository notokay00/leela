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
  it("keeps all personal artifacts withheld and unconsented by default", () => {
    for (const artifact of CORRESPONDENCE_ARTIFACTS) {
      assert.equal(artifact.publishStatus, "withheld");
      assert.equal(artifact.consentConfirmed, false);
    }

    for (const artifact of VOICES_AND_FILM_ARTIFACTS) {
      assert.equal(artifact.publishStatus, "withheld");
      assert.equal(artifact.consentConfirmed, false);
    }

    const mediaRecords = getRegisteredArchiveMediaRecords();
    for (const record of mediaRecords) {
      assert.equal(record.publishStatus, "withheld");
      assert.equal(record.consentConfirmed, false);
    }

    // Active production allowlist must contain zero withheld personal assets
    assert.equal(buildMediaAllowlist(mediaRecords).size, 0);
    assert.equal(resolveApprovedMediaAsset("arc-iii-01-film"), null);
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

  it("exposes Vercel Private Blob scaffold cleanly with supportsByteRanges=false", async () => {
    const scaffold = new VercelPrivateBlobStorageAdapter();
    assert.equal(scaffold.driverName, "vercel-private-blob");
    assert.equal(scaffold.supportsByteRanges, false);
    await assert.rejects(() => scaffold.stat("video/a.mp4", "video/mp4"));
    await assert.rejects(() => scaffold.openStream("video/a.mp4"));
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

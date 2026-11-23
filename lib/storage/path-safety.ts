import "server-only";
import { lstat, realpath } from "node:fs/promises";
import path from "node:path";

const WINDOWS_DRIVE_PATTERN = /^[a-zA-Z]:/;
const WINDOWS_RESERVED_NAME_PATTERN =
  /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i;
const CONTROL_CHAR_PATTERN = /[\u0000-\u001f\u007f]/;

/**
 * Platform-aware containment check using `path.relative` (never bare string
 * prefix matching, which is vulnerable to sibling-directory prefixes such as
 * `D:\media` vs `D:\media-evil`).
 */
export function isPathStrictlyInside(
  canonicalRoot: string,
  canonicalTarget: string,
  platform: NodeJS.Platform = process.platform
): boolean {
  const normalizedRoot = path.resolve(canonicalRoot);
  const normalizedTarget = path.resolve(canonicalTarget);

  if (platform === "win32") {
    const rootDrive = path.win32.parse(normalizedRoot).root.toLowerCase();
    const targetDrive = path.win32.parse(normalizedTarget).root.toLowerCase();
    if (!rootDrive || rootDrive !== targetDrive) {
      return false;
    }

    const relWin = path.win32.relative(normalizedRoot, normalizedTarget);
    if (
      relWin.length === 0 ||
      relWin === "." ||
      relWin === ".." ||
      relWin.startsWith("..\\") ||
      relWin.startsWith("../") ||
      path.win32.isAbsolute(relWin) ||
      WINDOWS_DRIVE_PATTERN.test(relWin)
    ) {
      return false;
    }
    return true;
  }

  const rel = path.posix.relative(normalizedRoot, normalizedTarget);
  return (
    rel.length > 0 &&
    rel !== "." &&
    rel !== ".." &&
    !rel.startsWith("../") &&
    !path.posix.isAbsolute(rel)
  );
}

export function isPathInsideOrEqual(
  parentPath: string,
  candidatePath: string,
  platform: NodeJS.Platform = process.platform
): boolean {
  const normParent = path.resolve(parentPath);
  const normCandidate = path.resolve(candidatePath);

  if (platform === "win32") {
    if (normParent.toLowerCase() === normCandidate.toLowerCase()) {
      return true;
    }
  } else if (normParent === normCandidate) {
    return true;
  }

  return isPathStrictlyInside(normParent, normCandidate, platform);
}

/**
 * Validates and splits a normalized internal relative storage path.
 * Rejects traversal (`..`, `.`), encoded traversal, backslashes, Windows drive
 * letters, UNC paths, alternate data streams (`:`), null bytes, leading slashes,
 * and Windows reserved device names.
 */
export function validateRelativeStoragePath(
  storageRelativePath: string
): string[] | null {
  if (
    typeof storageRelativePath !== "string" ||
    storageRelativePath.length === 0 ||
    storageRelativePath.length > 512
  ) {
    return null;
  }

  if (
    CONTROL_CHAR_PATTERN.test(storageRelativePath) ||
    storageRelativePath.includes("\\") ||
    storageRelativePath.includes(":") ||
    storageRelativePath.startsWith("/") ||
    storageRelativePath.endsWith("/") ||
    WINDOWS_DRIVE_PATTERN.test(storageRelativePath) ||
    storageRelativePath.startsWith("//")
  ) {
    return null;
  }

  // Reject URL-encoded traversal sequences inside storage keys.
  if (/%2e|%2f|%5c|%00/i.test(storageRelativePath)) {
    return null;
  }

  const segments = storageRelativePath.split("/");
  if (segments.length === 0) {
    return null;
  }

  for (const segment of segments) {
    if (
      segment.length === 0 ||
      segment === "." ||
      segment === ".." ||
      segment.endsWith(" ") ||
      segment.endsWith(".") ||
      WINDOWS_RESERVED_NAME_PATTERN.test(segment)
    ) {
      return null;
    }
  }

  return segments;
}

export interface LocalFsOps {
  lstat: typeof lstat;
  realpath: typeof realpath;
}

/**
 * Resolves a validated storage relative path inside `storageRoot` with:
 * 1. Verification that `storageRoot` lives strictly outside the repository and `public/`.
 * 2. Segment-by-segment `lstat` walk rejecting symlinks and Windows directory
 *    junctions / reparse points along the entire path.
 * 3. Canonical `realpath` containment verification via `isPathStrictlyInside`.
 * 4. Regular-file enforcement (`isFile()`).
 */
export async function resolveSafeLocalFile(
  storageRoot: string,
  storageRelativePath: string,
  options?: { repoRoot?: string; fsOps?: LocalFsOps }
): Promise<{ canonicalPath: string; size: number; mtime: Date } | null> {
  if (
    typeof storageRoot !== "string" ||
    storageRoot.trim().length === 0 ||
    CONTROL_CHAR_PATTERN.test(storageRoot) ||
    !path.isAbsolute(storageRoot)
  ) {
    return null;
  }

  const segments = validateRelativeStoragePath(storageRelativePath);
  if (!segments) {
    return null;
  }

  const fsOps: LocalFsOps = options?.fsOps ?? { lstat, realpath };

  let canonicalRoot: string;
  try {
    canonicalRoot = await fsOps.realpath(
      /* turbopackIgnore: true */ storageRoot
    );
  } catch {
    return null;
  }

  // Enforce that the configured media storage root lives strictly outside the
  // repository (and therefore also outside `public/`).
  const repoRoot = options?.repoRoot ?? process.cwd();
  try {
    const canonicalRepo = await fsOps.realpath(
      /* turbopackIgnore: true */ repoRoot
    );
    if (
      isPathInsideOrEqual(canonicalRepo, canonicalRoot) ||
      isPathInsideOrEqual(canonicalRoot, canonicalRepo)
    ) {
      return null;
    }
  } catch {
    return null;
  }

  const lexicalTarget = path.resolve(
    /* turbopackIgnore: true */ canonicalRoot,
    ...segments
  );
  if (!isPathStrictlyInside(canonicalRoot, lexicalTarget)) {
    return null;
  }

  // Walk every component via lstat to reject symlinks AND Windows directory
  // junctions / reparse points (which Node reports as isSymbolicLink() === true).
  let current = canonicalRoot;
  let finalLstat: Awaited<ReturnType<typeof lstat>> | null = null;
  for (let i = 0; i < segments.length; i++) {
    current = path.join(/* turbopackIgnore: true */ current, segments[i]);
    let entryStat: Awaited<ReturnType<typeof lstat>>;
    try {
      entryStat = await fsOps.lstat(/* turbopackIgnore: true */ current);
    } catch {
      return null;
    }

    if (entryStat.isSymbolicLink()) {
      return null;
    }

    const isLast = i === segments.length - 1;
    if (!isLast && !entryStat.isDirectory()) {
      return null;
    }
    if (isLast) {
      if (!entryStat.isFile()) {
        return null;
      }
      finalLstat = entryStat;
    }
  }

  if (!finalLstat) {
    return null;
  }

  let canonicalTarget: string;
  try {
    canonicalTarget = await fsOps.realpath(
      /* turbopackIgnore: true */ lexicalTarget
    );
  } catch {
    return null;
  }

  if (!isPathStrictlyInside(canonicalRoot, canonicalTarget)) {
    return null;
  }

  return {
    canonicalPath: canonicalTarget,
    size: finalLstat.size,
    mtime: finalLstat.mtime,
  };
}

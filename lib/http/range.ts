export type ParsedByteRange =
  | { kind: "none" }
  | { kind: "ignore" }
  | { kind: "unsatisfiable"; totalSize: number }
  | { kind: "satisfiable"; start: number; end: number; length: number };

const SINGLE_BYTE_RANGE_PATTERN = /^bytes=(\d*)-(\d*)$/i;

/**
 * RFC 9110 single-byte-range parser matching the agreed archive HTTP Range matrix:
 *
 * - No Range header                     -> { kind: "none" }          -> HTTP 200
 * - Unsupported unit / malformed /
 *   multi-range / reversed start > end  -> { kind: "ignore" }        -> HTTP 200
 * - Syntactically valid, unsatisfiable  -> { kind: "unsatisfiable" } -> HTTP 416
 * - Valid satisfiable start-end,
 *   open-ended (start-), or suffix (-N) -> { kind: "satisfiable" }   -> HTTP 206
 */
export function parseSingleByteRange(
  rangeHeader: string | null | undefined,
  totalSize: number
): ParsedByteRange {
  if (rangeHeader === null || rangeHeader === undefined) {
    return { kind: "none" };
  }

  const trimmed = rangeHeader.trim();
  if (trimmed.length === 0) {
    return { kind: "none" };
  }

  if (!Number.isSafeInteger(totalSize) || totalSize < 0) {
    return { kind: "ignore" };
  }

  // Multiple ranges (comma-separated) -> explicitly ignore Range and return 200.
  if (trimmed.includes(",")) {
    return { kind: "ignore" };
  }

  const match = SINGLE_BYTE_RANGE_PATTERN.exec(trimmed);
  if (!match) {
    // Unsupported unit (e.g., items=0-5) or malformed syntax -> ignore -> 200.
    return { kind: "ignore" };
  }

  const [, startRaw, endRaw] = match;

  // `bytes=-` (both empty) is malformed -> ignore -> 200.
  if (startRaw.length === 0 && endRaw.length === 0) {
    return { kind: "ignore" };
  }

  // Suffix range: `bytes=-N`
  if (startRaw.length === 0) {
    const suffixLength = Number(endRaw);
    if (!Number.isSafeInteger(suffixLength) || suffixLength < 0) {
      return { kind: "ignore" };
    }
    if (suffixLength === 0 || totalSize === 0) {
      return { kind: "unsatisfiable", totalSize };
    }
    const clampedLength = Math.min(suffixLength, totalSize);
    const start = totalSize - clampedLength;
    const end = totalSize - 1;
    return {
      kind: "satisfiable",
      start,
      end,
      length: end - start + 1,
    };
  }

  const start = Number(startRaw);
  if (!Number.isSafeInteger(start) || start < 0) {
    return { kind: "ignore" };
  }

  // Open-ended range: `bytes=start-`
  if (endRaw.length === 0) {
    if (totalSize === 0 || start >= totalSize) {
      return { kind: "unsatisfiable", totalSize };
    }
    const end = totalSize - 1;
    return {
      kind: "satisfiable",
      start,
      end,
      length: end - start + 1,
    };
  }

  // Explicit `bytes=start-end`
  const requestedEnd = Number(endRaw);
  if (!Number.isSafeInteger(requestedEnd) || requestedEnd < 0) {
    return { kind: "ignore" };
  }

  // Reversed bounds (start > end) are syntactically invalid -> ignore -> 200.
  if (start > requestedEnd) {
    return { kind: "ignore" };
  }

  if (totalSize === 0 || start >= totalSize) {
    return { kind: "unsatisfiable", totalSize };
  }

  const end = Math.min(requestedEnd, totalSize - 1);
  return {
    kind: "satisfiable",
    start,
    end,
    length: end - start + 1,
  };
}

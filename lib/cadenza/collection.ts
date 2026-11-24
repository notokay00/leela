import type {
  CadenzaClientPassage,
  CadenzaMoment,
  CadenzaPassage,
} from "./types.ts";

/**
 * Independent consent & publication gate for Cadenza passages.
 * A passage is included ONLY when explicitly marked `ready` AND
 * `consentConfirmed === true` with non-empty author-supplied text.
 */
export function isCadenzaPassageApproved(
  passage: Pick<CadenzaPassage, "publishStatus" | "consentConfirmed" | "body">
): boolean {
  return (
    passage.publishStatus === "ready" &&
    passage.consentConfirmed === true &&
    typeof passage.body === "string" &&
    passage.body.trim().length > 0
  );
}

/**
 * Filters and stably orders approved Cadenza passages by explicit `order`,
 * projecting them into sanitized client DTOs without internal consent flags.
 */
export function selectApprovedCadenzaPassages(
  passages: readonly CadenzaPassage[]
): CadenzaClientPassage[] {
  return passages
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => isCadenzaPassageApproved(item))
    .sort((a, b) => {
      if (a.item.order !== b.item.order) {
        return a.item.order - b.item.order;
      }
      return a.index - b.index;
    })
    .map(({ item }) => ({
      id: item.id,
      ...(item.heading !== undefined && item.heading.trim().length > 0
        ? { heading: item.heading }
        : {}),
      body: item.body,
      script: item.script ?? "Latin",
    }));
}

/**
 * Builds the calm, user-controlled sequence of reflective moments:
 * - Always opens with `arrival` ("Cadenza" / "Things Left Unsaid").
 * - Followed by approved author passages (one quiet moment each), OR a single
 *   open `pause` moment when no personal passages have been supplied yet.
 * - Always closes with `conclusion` (open-ended return to Index or leave archive).
 */
export function buildCadenzaMoments(
  approvedPassages: readonly CadenzaClientPassage[]
): CadenzaMoment[] {
  const middle: CadenzaMoment[] =
    approvedPassages.length > 0
      ? approvedPassages.map((passage) => ({
          kind: "passage" as const,
          id: `passage-${passage.id}`,
          passage,
        }))
      : [{ kind: "pause", id: "pause" }];

  return [
    { kind: "arrival", id: "arrival" },
    ...middle,
    { kind: "conclusion", id: "conclusion" },
  ];
}

/**
 * Pure clamped moment index navigation (never wraps unexpectedly, never auto-advances).
 */
export function clampCadenzaMomentIndex(
  index: number,
  totalMoments: number
): number {
  if (totalMoments <= 0 || !Number.isFinite(index)) {
    return 0;
  }
  return Math.max(0, Math.min(totalMoments - 1, Math.trunc(index)));
}

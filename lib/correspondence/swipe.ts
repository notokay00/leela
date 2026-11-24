export type CorrespondenceSwipeDirection = "next" | "prev" | "none";

export interface CorrespondenceSwipeInput {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  durationMs: number;
  hasPrevious: boolean;
  hasNext: boolean;
  cancelledByVertical?: boolean;
}

/**
 * Deliberate horizontal swipe thresholds for mobile poem reading:
 * - Minimum horizontal travel (64px) avoids accidental thumb wobble.
 * - Strict horizontal dominance (|dx| > |dy| * 1.6 and |dy| <= 90px) protects
 *   natural vertical scrolling on long Hindi and English poems.
 * - Duration cap (800ms) avoids triggering during slow text-selection drags.
 */
export const SWIPE_MIN_DISTANCE_PX = 64;
export const SWIPE_MAX_VERTICAL_DRIFT_PX = 90;
export const SWIPE_HORIZONTAL_DOMINANCE_RATIO = 1.6;
export const SWIPE_MAX_DURATION_MS = 800;

/**
 * Early vertical-scroll lock threshold: once a touch moves vertically by this
 * amount with vertical movement exceeding horizontal movement, the gesture is
 * treated as vertical scrolling for the rest of the touch lifecycle.
 */
export const VERTICAL_SCROLL_LOCK_PX = 28;

export function shouldCancelSwipeForVerticalScroll(
  deltaX: number,
  deltaY: number
): boolean {
  const absX = Math.abs(deltaX);
  const absY = Math.abs(deltaY);
  return absY >= VERTICAL_SCROLL_LOCK_PX && absY > absX;
}

/**
 * Pure gesture detector for individual Correspondence poem readers.
 * - Swipe left (deltaX < 0) -> "next" (only when hasNext is true; never wraps).
 * - Swipe right (deltaX > 0) -> "prev" (only when hasPrevious is true; never wraps).
 */
export function detectCorrespondenceSwipe(
  input: CorrespondenceSwipeInput
): CorrespondenceSwipeDirection {
  if (input.cancelledByVertical) {
    return "none";
  }

  if (
    !Number.isFinite(input.durationMs) ||
    input.durationMs < 0 ||
    input.durationMs > SWIPE_MAX_DURATION_MS
  ) {
    return "none";
  }

  const deltaX = input.endX - input.startX;
  const deltaY = input.endY - input.startY;
  const absX = Math.abs(deltaX);
  const absY = Math.abs(deltaY);

  if (absX < SWIPE_MIN_DISTANCE_PX) {
    return "none";
  }

  if (absY > SWIPE_MAX_VERTICAL_DRIFT_PX) {
    return "none";
  }

  if (absX <= absY * SWIPE_HORIZONTAL_DOMINANCE_RATIO) {
    return "none";
  }

  if (deltaX < 0) {
    return input.hasNext ? "next" : "none";
  }

  if (deltaX > 0) {
    return input.hasPrevious ? "prev" : "none";
  }

  return "none";
}

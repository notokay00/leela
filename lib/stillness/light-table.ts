export interface RectBounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface PrintTilt {
  rotateX: number;
  rotateY: number;
}

export interface TableLightPosition {
  x: number;
  y: number;
  inside: boolean;
}

export interface FlashlightSpotlight {
  x: number;
  y: number;
  radius: number;
  active: boolean;
}

export type ViewerSwipeAction = "prev" | "next" | "close" | "none";

/**
 * Maximum physical print tilt in degrees. Kept deliberately subtle so the print
 * feels gently lifted off darkroom glass rather than spinning or distorting.
 */
export const MAX_PRINT_TILT_DEG = 3.2;

/**
 * Per-photograph flashlight spotlight radius bounds (pixels).
 * Scaled from the shorter image dimension so portrait, landscape, square, and
 * wide panoramic prints all preserve a localized circular beam rather than
 * clipping into a rectangular strip (~25% larger illuminated area than the
 * initial 55–115px calibration while preserving darkroom confinement).
 */
export const MIN_FLASHLIGHT_RADIUS_PX = 62;
export const DEFAULT_FLASHLIGHT_RADIUS_PX = 95;
export const MAX_FLASHLIGHT_RADIUS_PX = 129;

/**
 * Upward offset (CSS pixels) applied to the flashlight spotlight centre above
 * the active pointer or fingertip so the illuminated circle stays clearly
 * visible above the cursor/finger on both desktop and mobile.
 */
export const FLASHLIGHT_VERTICAL_OFFSET_PX = 65;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Computes a localized circular flashlight radius from the shorter rendered
 * dimension of the photograph: clamp(min(width, height) * 0.50, 62, 129).
 */
export function computeFlashlightRadius(
  width: number,
  height: number
): number {
  if (width <= 0 || height <= 0) {
    return DEFAULT_FLASHLIGHT_RADIUS_PX;
  }

  const shorterSide = Math.min(width, height);
  return Math.round(
    clamp(shorterSide * 0.5, MIN_FLASHLIGHT_RADIUS_PX, MAX_FLASHLIGHT_RADIUS_PX)
  );
}

/**
 * Computes bounded local pixel coordinates and radius for the per-photograph
 * flashlight mask relative to the actual visible image rectangle.
 *
 * - Hit-testing (`active`) uses the unmodified pointer/touch coordinates.
 * - The illuminated spotlight centre is shifted upward by
 *   `FLASHLIGHT_VERTICAL_OFFSET_PX` (65 CSS px) and clamped strictly within
 *   `[0, width] x [0, height]` so near-edge illumination stays natural.
 * - Shared identically by desktop hover (`interactionMode: "hover"`) and
 *   mobile/tablet touch (`interactionMode: "touch"`).
 */
export function computeFlashlightSpotlight(
  clientX: number,
  clientY: number,
  imageRect: RectBounds,
  options?: {
    finePointer?: boolean;
    interactionMode?: "hover" | "touch";
    verticalOffsetPx?: number;
  }
): FlashlightSpotlight {
  const radius = computeFlashlightRadius(imageRect.width, imageRect.height);
  const isTouchInteraction = options?.interactionMode === "touch";

  if (
    (!isTouchInteraction && options?.finePointer === false) ||
    imageRect.width <= 0 ||
    imageRect.height <= 0
  ) {
    return {
      x: Math.round(Math.max(0, imageRect.width) / 2),
      y: Math.round(Math.max(0, imageRect.height) / 2),
      radius,
      active: false,
    };
  }

  const rawX = clientX - imageRect.left;
  const rawY = clientY - imageRect.top;
  const inside =
    rawX >= 0 &&
    rawX <= imageRect.width &&
    rawY >= 0 &&
    rawY <= imageRect.height;

  const verticalOffset =
    options?.verticalOffsetPx ?? FLASHLIGHT_VERTICAL_OFFSET_PX;

  return {
    x: Math.round(clamp(rawX, 0, imageRect.width)),
    y: Math.round(clamp(rawY - verticalOffset, 0, imageRect.height)),
    radius,
    active: inside,
  };
}

/**
 * Computes bounded local coordinates for the diffused pointer light over the
 * light-table surface.
 */
export function computeTableLightPosition(
  clientX: number,
  clientY: number,
  tableRect: RectBounds
): TableLightPosition {
  if (tableRect.width <= 0 || tableRect.height <= 0) {
    return { x: 0, y: 0, inside: false };
  }

  const rawX = clientX - tableRect.left;
  const rawY = clientY - tableRect.top;
  const inside =
    rawX >= 0 &&
    rawX <= tableRect.width &&
    rawY >= 0 &&
    rawY <= tableRect.height;

  return {
    x: Math.round(clamp(rawX, 0, tableRect.width)),
    y: Math.round(clamp(rawY, 0, tableRect.height)),
    inside,
  };
}

/**
 * Computes restrained 2.5D tilt angles for a photographic print under a fine
 * desktop pointer. Always returns zero tilt for reduced-motion or coarse/touch
 * devices.
 */
export function computePrintTilt(
  clientX: number,
  clientY: number,
  printRect: RectBounds,
  options?: { reducedMotion?: boolean; finePointer?: boolean }
): PrintTilt {
  if (
    options?.reducedMotion ||
    options?.finePointer === false ||
    printRect.width <= 0 ||
    printRect.height <= 0
  ) {
    return { rotateX: 0, rotateY: 0 };
  }

  const normX = clamp(
    ((clientX - printRect.left) / printRect.width) * 2 - 1,
    -1,
    1
  );
  const normY = clamp(
    ((clientY - printRect.top) / printRect.height) * 2 - 1,
    -1,
    1
  );

  // Subtle tilt toward/away from pointer
  const rotateY = Math.round(normX * MAX_PRINT_TILT_DEG * 100) / 100;
  const rotateX = Math.round(-normY * MAX_PRINT_TILT_DEG * 100) / 100;

  return {
    rotateX: Object.is(rotateX, -0) ? 0 : rotateX,
    rotateY: Object.is(rotateY, -0) ? 0 : rotateY,
  };
}

/**
 * Recognizes touch gestures inside the enlarged image viewer.
 * Swipe left -> next, swipe right -> prev, swipe down -> close.
 */
export function detectViewerSwipe(
  deltaX: number,
  deltaY: number
): ViewerSwipeAction {
  const absX = Math.abs(deltaX);
  const absY = Math.abs(deltaY);

  if (absX >= 48 && absX > absY * 1.35) {
    return deltaX < 0 ? "next" : "prev";
  }

  if (deltaY >= 72 && absY > absX * 1.45) {
    return "close";
  }

  return "none";
}

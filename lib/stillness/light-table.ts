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

export type ViewerSwipeAction = "prev" | "next" | "close" | "none";

/**
 * Maximum physical print tilt in degrees. Kept deliberately subtle so the print
 * feels gently lifted off darkroom glass rather than spinning or distorting.
 */
export const MAX_PRINT_TILT_DEG = 3.2;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
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

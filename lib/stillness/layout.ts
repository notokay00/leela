export interface LayoutPhotoInput {
  id: string;
  width: number;
  height: number;
}

export interface JustifiedRowItem<T extends LayoutPhotoInput> {
  photo: T;
  index: number;
  width: number;
  height: number;
  aspectRatio: number;
}

export interface JustifiedRow<T extends LayoutPhotoInput> {
  items: JustifiedRowItem<T>[];
  height: number;
  isComplete: boolean;
}

export interface JustifiedLayoutOptions {
  containerWidth: number;
  targetRowHeight?: number;
  gap?: number;
}

const DEFAULT_DESKTOP_TARGET_HEIGHT = 240;
const DEFAULT_MOBILE_TARGET_HEIGHT = 175;
const DEFAULT_GAP = 18;
const MOBILE_BREAKPOINT = 640;

export function getDefaultTargetRowHeight(containerWidth: number): number {
  if (containerWidth < MOBILE_BREAKPOINT) {
    return DEFAULT_MOBILE_TARGET_HEIGHT;
  }
  return DEFAULT_DESKTOP_TARGET_HEIGHT;
}

/**
 * Computes justified photographic contact-sheet rows:
 * - Preserves exact source order (never reorders / never masonry).
 * - Preserves exact intrinsic aspect ratios (zero cropping).
 * - Produces equal rendered heights across every completed row.
 * - Never stretches a sparse final row into excessively wide thumbnails.
 * - Handles portrait, landscape, square, and panoramic images cleanly on both
 *   desktop and mobile widths without horizontal overflow.
 */
export function computeJustifiedRows<T extends LayoutPhotoInput>(
  photos: readonly T[],
  options: JustifiedLayoutOptions
): JustifiedRow<T>[] {
  const containerWidth = Math.max(0, Math.floor(options.containerWidth));
  if (photos.length === 0 || containerWidth <= 0) {
    return [];
  }

  const gap = options.gap ?? DEFAULT_GAP;
  const targetRowHeight =
    options.targetRowHeight ?? getDefaultTargetRowHeight(containerWidth);

  const rows: JustifiedRow<T>[] = [];
  let currentBatch: Array<{ photo: T; index: number; ar: number }> = [];
  let currentArSum = 0;

  const flushCompleteRow = (
    batch: Array<{ photo: T; index: number; ar: number }>,
    arSum: number
  ) => {
    const totalGap = gap * (batch.length - 1);
    const availableWidth = Math.max(1, containerWidth - totalGap);
    const rowHeight = availableWidth / arSum;

    let allocatedWidth = 0;
    const items: JustifiedRowItem<T>[] = batch.map((entry, idx) => {
      const isLast = idx === batch.length - 1;
      const rawWidth = rowHeight * entry.ar;
      const width = isLast
        ? Math.max(1, Math.round((availableWidth - allocatedWidth) * 100) / 100)
        : Math.max(1, Math.round(rawWidth * 100) / 100);
      allocatedWidth += width;

      return {
        photo: entry.photo,
        index: entry.index,
        width,
        height: Math.round(rowHeight * 100) / 100,
        aspectRatio: entry.ar,
      };
    });

    rows.push({
      items,
      height: Math.round(rowHeight * 100) / 100,
      isComplete: true,
    });
  };

  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i];
    const safeWidth = photo.width > 0 ? photo.width : 1;
    const safeHeight = photo.height > 0 ? photo.height : 1;
    const ar = safeWidth / safeHeight;

    currentBatch.push({ photo, index: i, ar });
    currentArSum += ar;

    const totalGap = gap * (currentBatch.length - 1);
    const projectedWidth = currentArSum * targetRowHeight + totalGap;

    if (projectedWidth >= containerWidth) {
      flushCompleteRow(currentBatch, currentArSum);
      currentBatch = [];
      currentArSum = 0;
    }
  }

  // Sparse final row: keep natural target height (never stretch across container)
  // while capping if a single wide item would exceed containerWidth.
  if (currentBatch.length > 0) {
    const totalGap = gap * (currentBatch.length - 1);
    const availableWidth = Math.max(1, containerWidth - totalGap);
    const maxHeightThatFits = availableWidth / currentArSum;
    const finalHeight = Math.min(targetRowHeight, maxHeightThatFits);
    const roundedHeight = Math.round(finalHeight * 100) / 100;

    const items: JustifiedRowItem<T>[] = currentBatch.map((entry) => ({
      photo: entry.photo,
      index: entry.index,
      width: Math.max(1, Math.round(finalHeight * entry.ar * 100) / 100),
      height: roundedHeight,
      aspectRatio: entry.ar,
    }));

    rows.push({
      items,
      height: roundedHeight,
      isComplete: false,
    });
  }

  return rows;
}

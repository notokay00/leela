export interface ChronologyPhotoInput {
  id: string;
  capturedAt?: string;
}

export interface ChronologyGroup<T extends ChronologyPhotoInput> {
  key: string;
  label: string;
  isUndated: boolean;
  items: Array<{ photo: T; sourceIndex: number }>;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/;

interface ParsedDate {
  year: number;
  month: number; // 1..12
  day: number; // 0 if month-only, else 1..31
  groupKey: string;
  label: string;
}

/**
 * Strictly parses explicit genuine capture dates (`YYYY-MM` or `YYYY-MM-DD`).
 * Never infers or invents missing dates.
 */
export function parseGenuineCaptureDate(
  raw: string | undefined
): ParsedDate | null {
  if (typeof raw !== "string") {
    return null;
  }

  const match = ISO_DATE_PATTERN.exec(raw.trim());
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = match[3] ? Number(match[3]) : 0;

  if (year < 1826 || year > 2100 || month < 1 || month > 12) {
    return null;
  }

  if (day !== 0) {
    const check = new Date(Date.UTC(year, month - 1, day));
    if (
      check.getUTCFullYear() !== year ||
      check.getUTCMonth() !== month - 1 ||
      check.getUTCDate() !== day
    ) {
      return null;
    }
  }

  const monthPadded = String(month).padStart(2, "0");
  return {
    year,
    month,
    day,
    groupKey: `${year}-${monthPadded}`,
    label: `${MONTH_NAMES[month - 1]} ${year}`,
  };
}

/**
 * Groups photographs by genuine recorded year and month.
 * - Preserves source ordering when dates are equal or missing.
 * - Places all undated photographs into a final `UNDATED` group.
 */
export function groupPhotosChronologically<T extends ChronologyPhotoInput>(
  photos: readonly T[]
): ChronologyGroup<T>[] {
  const datedEntries: Array<{
    photo: T;
    sourceIndex: number;
    parsed: ParsedDate;
  }> = [];
  const undatedEntries: Array<{ photo: T; sourceIndex: number }> = [];

  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i];
    const parsed = parseGenuineCaptureDate(photo.capturedAt);
    if (parsed) {
      datedEntries.push({ photo, sourceIndex: i, parsed });
    } else {
      undatedEntries.push({ photo, sourceIndex: i });
    }
  }

  // Stable chronological sort (year -> month -> day -> original sourceIndex)
  datedEntries.sort((a, b) => {
    if (a.parsed.year !== b.parsed.year) return a.parsed.year - b.parsed.year;
    if (a.parsed.month !== b.parsed.month) return a.parsed.month - b.parsed.month;
    if (a.parsed.day !== b.parsed.day) return a.parsed.day - b.parsed.day;
    return a.sourceIndex - b.sourceIndex;
  });

  const groupMap = new Map<string, ChronologyGroup<T>>();
  for (const entry of datedEntries) {
    let group = groupMap.get(entry.parsed.groupKey);
    if (!group) {
      group = {
        key: entry.parsed.groupKey,
        label: entry.parsed.label,
        isUndated: false,
        items: [],
      };
      groupMap.set(entry.parsed.groupKey, group);
    }
    group.items.push({ photo: entry.photo, sourceIndex: entry.sourceIndex });
  }

  const groups = [...groupMap.values()];

  if (undatedEntries.length > 0) {
    groups.push({
      key: "UNDATED",
      label: "UNDATED",
      isUndated: true,
      items: undatedEntries,
    });
  }

  return groups;
}

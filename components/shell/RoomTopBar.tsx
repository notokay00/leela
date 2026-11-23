import Link from "next/link";
import { cn } from "@/lib/cn";

export interface RoomTopBarProps {
  catalogueRef?: string;
  tone?: "dark" | "light";
  rightSlot?: React.ReactNode;
}

/**
 * Consistent room navigation bar used by every implemented archive room.
 * Provides a single small monospace `INDEX` control in the exact same position,
 * avoiding large back buttons, breadcrumbs, or floating navigation menus.
 */
export function RoomTopBar({
  catalogueRef,
  tone = "dark",
  rightSlot,
}: RoomTopBarProps) {
  const isLight = tone === "light";

  return (
    <header className="room-top-bar flex items-center justify-between">
      <div className="flex items-center gap-5">
        <Link
          href="/archive"
          className={cn(
            "threshold-control font-mono text-[11px] tracking-[0.22em] uppercase",
            isLight
              ? "text-paper-ink-secondary hover:text-paper-ink"
              : "text-ink-secondary hover:text-ink"
          )}
        >
          INDEX
        </Link>
        {catalogueRef && (
          <span
            className={cn(
              "font-mono text-[11px] tracking-[0.16em]",
              isLight ? "text-paper-ink-secondary" : "text-ink-dim"
            )}
          >
            {catalogueRef}
          </span>
        )}
      </div>
      {rightSlot && <div className="flex items-center">{rightSlot}</div>}
    </header>
  );
}

import Link from "next/link";
import { LockArchiveButton } from "@/components/shell/LockArchiveButton";
import {
  ARCHIVE_COLLECTION_DESCRIPTION,
  getMovementHref,
  type ArchiveMovementEntry,
} from "@/content/movements";
import { cn } from "@/lib/cn";

export interface EditorialIndexProps {
  movements: readonly ArchiveMovementEntry[];
}

const SLIVER_CLASS_BY_GROUND: Record<
  ArchiveMovementEntry["groundToken"],
  string
> = {
  stillness: "room-sliver-stillness",
  correspondence: "room-sliver-correspondence",
  "voices-film": "room-sliver-voices-film",
  cadenza: "room-sliver-cadenza",
};

function EntryContent({ movement }: { movement: ArchiveMovementEntry }) {
  return (
    <div className="flex w-full items-start gap-5 sm:items-center sm:gap-7">
      <span
        aria-hidden="true"
        className={cn(
          "mt-1 h-9 w-1.5 shrink-0 sm:mt-0",
          SLIVER_CLASS_BY_GROUND[movement.groundToken]
        )}
      />

      <div className="min-w-0 flex-1">
        <span className="block font-serif text-2xl font-normal tracking-[0.02em] text-ink sm:text-[1.65rem]">
          {movement.title}
        </span>
        <span className="mt-1 block font-sans text-sm leading-relaxed text-ink-dim">
          {movement.description}
        </span>
      </div>
    </div>
  );
}

/**
 * Editorial Index — Quiet literary table of contents for the four rooms.
 * Internal movement identifiers, ordering, and routing remain intact in
 * `content/movements.ts`, while the visible interface omits technical
 * `AU/` catalogue codes and Roman numeral classifications.
 */
export function EditorialIndex({ movements }: EditorialIndexProps) {
  return (
    <main className="index-stage flex min-h-[100dvh] flex-col bg-void text-ink">
      <div className="mx-auto flex w-full max-w-[var(--max-width-index)] flex-1 flex-col justify-center">
        <header className="mb-12 sm:mb-16">
          <div className="flex items-baseline justify-between gap-4">
            <h1 className="threshold-title font-serif font-normal tracking-[0.24em] text-ink uppercase">
              The Archive of Us
            </h1>
            <LockArchiveButton />
          </div>

          <p className="mt-4 font-serif text-lg text-ink-secondary italic">
            {ARCHIVE_COLLECTION_DESCRIPTION}
          </p>
        </header>

        <nav aria-label="Archive rooms">
          <ul className="border-t border-hairline">
            {movements.map((movement) => {
              const href = getMovementHref(movement);

              return (
                <li key={movement.slug} className="border-b border-hairline">
                  {href ? (
                    <Link
                      href={href}
                      className="threshold-control group block py-7 transition-opacity hover:opacity-100 sm:py-8"
                    >
                      <EntryContent movement={movement} />
                    </Link>
                  ) : (
                    <div
                      aria-disabled="true"
                      className="block py-7 sm:py-8"
                    >
                      <EntryContent movement={movement} />
                      <span className="sr-only">
                        {movement.title} is not yet open.
                      </span>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </main>
  );
}

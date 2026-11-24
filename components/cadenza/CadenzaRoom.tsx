"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAudio } from "@/components/audio/AudioProvider";
import { cn } from "@/lib/cn";
import { clampCadenzaMomentIndex } from "@/lib/cadenza/collection";
import type { CadenzaMoment, CadenzaScript } from "@/lib/cadenza/types";

export interface CadenzaRoomProps {
  moments: readonly CadenzaMoment[];
}

function getPassageTypographyClass(script: CadenzaScript): string {
  switch (script) {
    case "Devanagari":
      return "correspondence-verse-devanagari";
    case "Mixed":
      return "correspondence-verse-mixed";
    case "Latin":
    default:
      return "cadenza-passage-latin";
  }
}

function getMomentAccessibleLabel(moment: CadenzaMoment, index: number): string {
  switch (moment.kind) {
    case "arrival":
      return "Arrival";
    case "pause":
      return "Pause";
    case "passage":
      return moment.passage.heading ?? `Passage ${index}`;
    case "conclusion":
      return "Closing";
  }
}

/**
 * Movement IV — Cadenza: Things Left Unsaid.
 *
 * - Quiet, diffused-daylight reflective space with user-controlled progression
 *   (no timers, no automatic advancement, no persuasion or reply prompts).
 * - Keyboard accessible via Tab/Enter/Space and Left/Right arrow keys.
 * - Reuses the existing `/api/auth/lock` endpoint cleanly for the optional
 *   dignified "Leave the archive" action at the conclusion.
 */
export function CadenzaRoom({ moments }: CadenzaRoomProps) {
  const router = useRouter();
  const { enterInSilence } = useAudio();
  const [activeIndex, setActiveIndex] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);

  const total = moments.length;
  const safeIndex = clampCadenzaMomentIndex(activeIndex, total);
  const currentMoment = moments[safeIndex];
  const canGoBack = safeIndex > 0;
  const canContinue = safeIndex < total - 1;

  const goToIndex = useCallback(
    (next: number) => {
      setActiveIndex(clampCadenzaMomentIndex(next, total));
    },
    [total]
  );

  // Subtle keyboard arrow progression when focus is not inside a form control.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (event.key === "ArrowRight" && canContinue) {
        event.preventDefault();
        goToIndex(safeIndex + 1);
      } else if (event.key === "ArrowLeft" && canGoBack) {
        event.preventDefault();
        goToIndex(safeIndex - 1);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canContinue, canGoBack, goToIndex, safeIndex]);

  async function handleLeaveArchive() {
    if (leaving) {
      return;
    }
    setLeaving(true);
    enterInSilence();

    try {
      await fetch("/api/auth/lock", {
        method: "POST",
        credentials: "same-origin",
      });
    } finally {
      router.replace("/");
      router.refresh();
    }
  }

  if (!currentMoment) {
    return null;
  }

  return (
    <div
      ref={stageRef}
      className="cadenza-container mx-auto flex w-full max-w-[42rem] flex-1 flex-col justify-between"
    >
      {/* Active reflective moment — generous negative space, soft fade transition */}
      <div className="flex flex-1 flex-col items-center justify-center py-10 sm:py-16">
        <section
          key={currentMoment.id}
          aria-live="polite"
          aria-label={getMomentAccessibleLabel(currentMoment, safeIndex)}
          className="cadenza-moment-enter flex w-full flex-col items-center text-center"
        >
          {currentMoment.kind === "arrival" && (
            <div className="flex max-w-[28rem] flex-col items-center">
              <h1 className="font-serif text-[clamp(2.25rem,1.8rem+1.8vw,3.35rem)] font-normal tracking-[0.04em] text-cadenza-ink">
                Cadenza
              </h1>
              <span
                aria-hidden="true"
                className="cadenza-breath-rule my-7"
              />
              <p className="font-serif text-[clamp(1.125rem,1.02rem+0.4vw,1.35rem)] font-normal tracking-[0.03em] text-cadenza-ink-secondary italic">
                Things Left Unsaid
              </p>
            </div>
          )}

          {currentMoment.kind === "pause" && (
            <div className="flex max-w-[26rem] flex-col items-center">
              <div
                aria-hidden="true"
                className="cadenza-stillness-aperture mb-10"
              >
                <span className="cadenza-stillness-line" />
              </div>
              <p className="font-serif text-[clamp(1.0625rem,1rem+0.25vw,1.2rem)] leading-relaxed text-cadenza-ink-secondary italic">
                This space is kept quiet.
              </p>
            </div>
          )}

          {currentMoment.kind === "passage" && (
            <article className="w-full max-w-[36rem] text-left">
              {currentMoment.passage.heading && (
                <h2 className="mb-8 font-serif text-[clamp(1.5rem,1.3rem+0.8vw,2rem)] font-normal tracking-[0.015em] text-cadenza-ink">
                  {currentMoment.passage.heading}
                </h2>
              )}
              <div
                className={cn(
                  "text-cadenza-ink",
                  getPassageTypographyClass(currentMoment.passage.script)
                )}
              >
                {currentMoment.passage.body}
              </div>
            </article>
          )}

          {currentMoment.kind === "conclusion" && (
            <div className="flex max-w-[26rem] flex-col items-center">
              <span
                aria-hidden="true"
                className="cadenza-horizon-rule mb-12"
              />

              <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-10">
                <Link
                  href="/archive"
                  className="cadenza-ending-action font-serif text-lg tracking-[0.02em] text-cadenza-ink hover:text-cadenza-ink-strong"
                >
                  Return to the Index
                </Link>

                <span
                  aria-hidden="true"
                  className="hidden h-3.5 w-px bg-cadenza-hairline sm:block"
                />

                <button
                  type="button"
                  onClick={handleLeaveArchive}
                  disabled={leaving}
                  className={cn(
                    "cadenza-ending-action cursor-pointer bg-transparent font-serif text-lg tracking-[0.02em] text-cadenza-ink-secondary italic hover:text-cadenza-ink",
                    leaving && "cursor-wait opacity-50"
                  )}
                >
                  {leaving ? "Closing…" : "Leave the archive"}
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Quiet, user-controlled progression bar (no timers, no forced pacing) */}
      <nav
        aria-label="Cadenza moments"
        className="flex items-center justify-between gap-4 border-t border-cadenza-hairline/70 pt-6 pb-2"
      >
        <div className="flex min-w-[5.5rem] justify-start">
          {canGoBack && (
            <button
              type="button"
              onClick={() => goToIndex(safeIndex - 1)}
              className="cadenza-nav-button"
            >
              Previous
            </button>
          )}
        </div>

        <div
          role="group"
          aria-label="Choose moment"
          className="flex items-center gap-2.5"
        >
          {moments.map((moment, idx) => {
            const isCurrent = idx === safeIndex;
            return (
              <button
                key={moment.id}
                type="button"
                onClick={() => goToIndex(idx)}
                aria-label={getMomentAccessibleLabel(moment, idx)}
                aria-current={isCurrent ? "step" : undefined}
                className="cadenza-step-button"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "cadenza-step-pip",
                    isCurrent && "cadenza-step-pip-active"
                  )}
                />
              </button>
            );
          })}
        </div>

        <div className="flex min-w-[5.5rem] justify-end">
          {canContinue && (
            <button
              type="button"
              onClick={() => goToIndex(safeIndex + 1)}
              className="cadenza-nav-button cadenza-nav-button-primary"
            >
              Continue
            </button>
          )}
        </div>
      </nav>
    </div>
  );
}

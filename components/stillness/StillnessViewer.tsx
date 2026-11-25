"use client";

import { useEffect, useRef, useState, type TouchEvent } from "react";
import type { StillnessClientPhoto } from "@/content/artifacts/stillness";
import { cn } from "@/lib/cn";
import { detectViewerSwipe } from "@/lib/stillness/light-table";

export interface StillnessViewerProps {
  photos: readonly StillnessClientPhoto[];
  currentIndex: number;
  onNavigate: (nextIndex: number) => void;
  onClose: () => void;
}

export function StillnessViewer({
  photos,
  currentIndex,
  onNavigate,
  onClose,
}: StillnessViewerProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  const photo = photos[currentIndex];
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < photos.length - 1;
  const imageError = photo ? failedSrc === photo.src : false;

  // Lock background scroll while viewer is open and move focus to Close control.
  useEffect(() => {
    document.documentElement.classList.add("viewer-scroll-lock");
    document.body.classList.add("viewer-scroll-lock");
    closeButtonRef.current?.focus();

    return () => {
      document.documentElement.classList.remove("viewer-scroll-lock");
      document.body.classList.remove("viewer-scroll-lock");
    };
  }, []);

  // Keyboard shortcuts (Escape, ArrowLeft, ArrowRight) + strict dialog focus trap.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") {
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        if (hasPrevious) {
          onNavigate(currentIndex - 1);
        }
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        if (hasNext) {
          onNavigate(currentIndex + 1);
        }
        return;
      }

      if (event.key === "Tab") {
        const dialog = dialogRef.current;
        if (!dialog) {
          return;
        }
        const focusables = Array.from(
          dialog.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
          )
        );
        if (focusables.length === 0) {
          event.preventDefault();
          return;
        }

        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement | null;

        if (event.shiftKey) {
          if (!active || active === first || !dialog.contains(active)) {
            event.preventDefault();
            last.focus();
          }
        } else if (!active || active === last || !dialog.contains(active)) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [currentIndex, hasNext, hasPrevious, onClose, onNavigate]);

  if (!photo) {
    return null;
  }

  function handleTouchStart(event: TouchEvent<HTMLDivElement>) {
    if (event.touches.length !== 1) {
      touchStartRef.current = null;
      return;
    }
    const touch = event.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }

  function handleTouchEnd(event: TouchEvent<HTMLDivElement>) {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start || event.changedTouches.length !== 1) {
      return;
    }

    const touch = event.changedTouches[0];
    const action = detectViewerSwipe(
      touch.clientX - start.x,
      touch.clientY - start.y
    );

    if (action === "next" && hasNext) {
      onNavigate(currentIndex + 1);
    } else if (action === "prev" && hasPrevious) {
      onNavigate(currentIndex - 1);
    } else if (action === "close") {
      onClose();
    }
  }

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Photograph viewer — Stillness ${photo.catalogId}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="stillness-viewer-overlay fixed inset-0 z-50 flex flex-col justify-between text-ink"
    >
      {/* Top viewer bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-baseline gap-3 font-mono text-xs tracking-[0.14em] text-ink-secondary uppercase">
          <span aria-live="polite">
            {String(currentIndex + 1).padStart(2, "0")} of{" "}
            {String(photos.length).padStart(2, "0")}
          </span>
          <span aria-hidden="true" className="text-ink-muted">
            ·
          </span>
          <span className="text-ink-dim">Stillness</span>
          {photo.capturedAt && (
            <span className="hidden text-ink-dim sm:inline">
              {photo.capturedAt}
            </span>
          )}
        </div>

        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="Close photograph viewer"
          className="threshold-control cursor-pointer px-2 py-1 font-mono text-xs tracking-[0.2em] text-ink-secondary uppercase hover:text-ink"
        >
          Close
        </button>
      </div>

      {/* Contained photographic viewing stage (preserves intrinsic ratio, zero cropping) */}
      <div
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            onClose();
          }
        }}
        className="stillness-viewer-frame my-4 flex min-h-0 flex-1 items-center justify-center"
      >
        {imageError ? (
          <div className="flex h-64 w-full max-w-md flex-col items-center justify-center border border-hairline bg-chamber px-6 text-center">
            <p className="font-mono text-xs tracking-[0.18em] text-ink-dim uppercase">
              Stillness · {photo.catalogId}
            </p>
            <p className="mt-3 font-sans text-sm text-ink-secondary">
              This photograph could not be loaded.
            </p>
          </div>
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={photo.src}
            alt={photo.altText}
            width={photo.width}
            height={photo.height}
            decoding="async"
            onError={() => setFailedSrc(photo.src)}
            className="max-h-[calc(100dvh-12rem)] max-w-full object-contain shadow-[0_24px_64px_rgba(0,0,0,0.85)] select-none"
          />
        )}
      </div>

      {/* Bottom controls & optional explicit caption (never falls back to altText) */}
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-h-[1.25rem] max-w-xl text-center sm:text-left">
          {photo.caption && (
            <p className="font-serif text-base leading-relaxed text-ink-secondary">
              {photo.caption}
            </p>
          )}
        </div>

        <div className="flex items-center gap-6">
          <button
            type="button"
            disabled={!hasPrevious}
            onClick={() => hasPrevious && onNavigate(currentIndex - 1)}
            aria-label="Previous photograph"
            className={cn(
              "threshold-control px-2 py-1 font-mono text-xs tracking-[0.18em] uppercase",
              hasPrevious
                ? "cursor-pointer text-ink-secondary hover:text-ink"
                : "cursor-not-allowed text-ink-muted opacity-40"
            )}
          >
            Previous
          </button>

          <button
            type="button"
            disabled={!hasNext}
            onClick={() => hasNext && onNavigate(currentIndex + 1)}
            aria-label="Next photograph"
            className={cn(
              "threshold-control px-2 py-1 font-mono text-xs tracking-[0.18em] uppercase",
              hasNext
                ? "cursor-pointer text-ink-secondary hover:text-ink"
                : "cursor-not-allowed text-ink-muted opacity-40"
            )}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

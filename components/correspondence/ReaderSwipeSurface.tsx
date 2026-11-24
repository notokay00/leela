"use client";

import { useEffect, useRef, type ReactNode, type TouchEvent } from "react";
import { useRouter } from "next/navigation";
import {
  detectCorrespondenceSwipe,
  shouldCancelSwipeForVerticalScroll,
} from "@/lib/correspondence/swipe";

export interface ReaderSwipeSurfaceProps {
  previousHref: string | null;
  nextHref: string | null;
  children: ReactNode;
}

const INTERACTIVE_SELECTOR =
  'a, button, input, textarea, select, summary, [role="button"], [role="link"]';

function isInteractiveElement(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }
  return target.closest(INTERACTIVE_SELECTOR) !== null;
}

interface ActiveTouchState {
  startX: number;
  startY: number;
  startTime: number;
  cancelledByVertical: boolean;
}

/**
 * Unobtrusive horizontal touch-swipe handler mounted strictly on individual
 * Correspondence reader pages.
 *
 * - Swipe left -> next poem; swipe right -> previous poem (never wraps).
 * - Never calls preventDefault() so native iOS Safari and Android vertical
 *   scrolling and pinch-zoom remain completely smooth.
 * - Ignores touches originating on interactive elements, multi-touch gestures,
 *   active text selections, and vertical scrolls.
 * - Uses `router.push` to preserve native browser Back/Forward history and
 *   guards against accidental double navigation from a single gesture.
 */
export function ReaderSwipeSurface({
  previousHref,
  nextHref,
  children,
}: ReaderSwipeSurfaceProps) {
  const router = useRouter();
  const touchRef = useRef<ActiveTouchState | null>(null);
  const navigatingRef = useRef(false);

  // Reset single-navigation lock whenever the reader route changes.
  useEffect(() => {
    navigatingRef.current = false;
    touchRef.current = null;
  }, [previousHref, nextHref]);

  function handleTouchStart(event: TouchEvent<HTMLDivElement>) {
    if (navigatingRef.current || event.touches.length !== 1) {
      touchRef.current = null;
      return;
    }

    if (isInteractiveElement(event.target)) {
      touchRef.current = null;
      return;
    }

    const touch = event.touches[0];
    touchRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: Date.now(),
      cancelledByVertical: false,
    };
  }

  function handleTouchMove(event: TouchEvent<HTMLDivElement>) {
    const state = touchRef.current;
    if (!state) {
      return;
    }

    if (event.touches.length !== 1) {
      touchRef.current = null;
      return;
    }

    if (state.cancelledByVertical) {
      return;
    }

    const touch = event.touches[0];
    if (
      shouldCancelSwipeForVerticalScroll(
        touch.clientX - state.startX,
        touch.clientY - state.startY
      )
    ) {
      state.cancelledByVertical = true;
    }
  }

  function handleTouchEnd(event: TouchEvent<HTMLDivElement>) {
    const state = touchRef.current;
    touchRef.current = null;

    if (!state || navigatingRef.current || event.changedTouches.length !== 1) {
      return;
    }

    // Do not navigate if the visitor has selected text on the page.
    if (
      typeof window !== "undefined" &&
      (window.getSelection()?.toString().length ?? 0) > 0
    ) {
      return;
    }

    const touch = event.changedTouches[0];
    const direction = detectCorrespondenceSwipe({
      startX: state.startX,
      startY: state.startY,
      endX: touch.clientX,
      endY: touch.clientY,
      durationMs: Date.now() - state.startTime,
      hasPrevious: previousHref !== null,
      hasNext: nextHref !== null,
      cancelledByVertical: state.cancelledByVertical,
    });

    const targetHref =
      direction === "next"
        ? nextHref
        : direction === "prev"
          ? previousHref
          : null;

    if (targetHref) {
      navigatingRef.current = true;
      router.push(targetHref);
    }
  }

  function handleTouchCancel() {
    touchRef.current = null;
  }

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      data-swipe-prev={previousHref ? "true" : "false"}
      data-swipe-next={nextHref ? "true" : "false"}
    >
      {children}
    </div>
  );
}

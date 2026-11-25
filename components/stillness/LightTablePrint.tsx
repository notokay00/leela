"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from "react";
import type { StillnessClientPhoto } from "@/content/artifacts/stillness";
import {
  TOUCH_HOLD_LOCK_MS,
  TOUCH_MOVE_SLOP_PX,
  computeFlashlightRadius,
  computeFlashlightSpotlight,
  computePrintTilt,
  resolveTouchFlashlightMode,
  shouldSuppressClickAfterTouchHold,
  type TouchFlashlightMode,
} from "@/lib/stillness/light-table";

export interface LightTablePrintProps {
  photo: StillnessClientPhoto;
  width: number;
  height: number;
  enableFlashlight: boolean;
  enableTilt: boolean;
  isActive: boolean;
  isSelected: boolean;
  onActiveChange: (photoId: string | null) => void;
  onSelect: (photoId: string) => void;
  registerButtonRef: (photoId: string, node: HTMLButtonElement | null) => void;
}

export function LightTablePrint({
  photo,
  width,
  height,
  enableFlashlight,
  enableTilt,
  isActive,
  isSelected,
  onActiveChange,
  onSelect,
  registerButtonRef,
}: LightTablePrintProps) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const frameRef = useRef<HTMLSpanElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const pendingPointerRef = useRef<{
    x: number;
    y: number;
    mode: "hover" | "touch";
  } | null>(null);
  const touchActiveRef = useRef(false);
  const holdTimerRef = useRef<number | null>(null);
  const touchGestureRef = useRef<{
    startTime: number;
    startX: number;
    startY: number;
    maxDistance: number;
    mode: TouchFlashlightMode;
  } | null>(null);
  const suppressClickUntilRef = useRef<number>(0);
  const runtimeRef = useRef({
    photoId: photo.id,
    isActive,
    enableTilt,
    onActiveChange,
  });
  const [imageError, setImageError] = useState(false);

  useLayoutEffect(() => {
    runtimeRef.current = {
      photoId: photo.id,
      isActive,
      enableTilt,
      onActiveChange,
    };
  });

  // Apply justified pixel dimensions and image-scaled spotlight radius via CSSOM
  // (no SSR style="" attribute — keeps strict nonce CSP clean).
  useLayoutEffect(() => {
    const button = buttonRef.current;
    if (button) {
      button.style.width = `${width}px`;
      button.style.height = `${height}px`;
    }

    const frame = frameRef.current;
    if (frame) {
      const radius = computeFlashlightRadius(width, height);
      frame.style.setProperty("--spot-radius", `${radius}px`);
    }
  }, [width, height]);

  function clearHoldTimer() {
    if (holdTimerRef.current !== null) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }

  function updateSpotlightAndTilt(
    clientX: number,
    clientY: number,
    interactionMode: "hover" | "touch"
  ) {
    const button = buttonRef.current;
    const frame = frameRef.current;
    if (!button || !frame) {
      return;
    }

    const frameRect = frame.getBoundingClientRect();
    const spotlight = computeFlashlightSpotlight(clientX, clientY, frameRect, {
      finePointer: interactionMode === "hover",
      interactionMode,
    });

    frame.style.setProperty("--spot-x", `${spotlight.x}px`);
    frame.style.setProperty("--spot-y", `${spotlight.y}px`);
    frame.style.setProperty("--spot-radius", `${spotlight.radius}px`);
    frame.style.setProperty("--spot-opacity", spotlight.active ? "1" : "0");

    if (interactionMode === "hover" && runtimeRef.current.enableTilt) {
      const buttonRect = button.getBoundingClientRect();
      const { rotateX, rotateY } = computePrintTilt(
        clientX,
        clientY,
        buttonRect,
        {
          finePointer: true,
          reducedMotion: false,
        }
      );
      button.style.setProperty("--tilt-x", `${rotateX}deg`);
      button.style.setProperty("--tilt-y", `${rotateY}deg`);
    }
  }

  function resetInteraction() {
    touchActiveRef.current = false;
    clearHoldTimer();
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    pendingPointerRef.current = null;

    const button = buttonRef.current;
    if (button) {
      button.removeAttribute("data-touch-spot");
      button.style.setProperty("--tilt-x", "0deg");
      button.style.setProperty("--tilt-y", "0deg");
    }

    // Fade out at the pointer's last coordinates to avoid any snap on leave.
    const frame = frameRef.current;
    if (frame) {
      frame.style.setProperty("--spot-opacity", "0");
    }
  }

  function scheduleSpotlightUpdate(
    clientX: number,
    clientY: number,
    mode: "hover" | "touch"
  ) {
    pendingPointerRef.current = { x: clientX, y: clientY, mode };

    if (rafRef.current !== null) {
      return;
    }

    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      const point = pendingPointerRef.current;
      if (!point) {
        return;
      }
      updateSpotlightAndTilt(point.x, point.y, point.mode);
    });
  }

  function startTouchGesture(clientX: number, clientY: number) {
    clearHoldTimer();
    suppressClickUntilRef.current = 0;
    touchActiveRef.current = true;
    touchGestureRef.current = {
      startTime: Date.now(),
      startX: clientX,
      startY: clientY,
      maxDistance: 0,
      mode: "pending",
    };
    holdTimerRef.current = window.setTimeout(() => {
      holdTimerRef.current = null;
      const gesture = touchGestureRef.current;
      if (
        gesture &&
        gesture.mode === "pending" &&
        gesture.maxDistance < TOUCH_MOVE_SLOP_PX
      ) {
        gesture.mode = "flashlight";
      }
    }, TOUCH_HOLD_LOCK_MS);
    buttonRef.current?.setAttribute("data-touch-spot", "true");
    runtimeRef.current.onActiveChange(runtimeRef.current.photoId);
    updateSpotlightAndTilt(clientX, clientY, "touch");
  }

  function finishTouchGesture(isNormalEnd: boolean) {
    clearHoldTimer();
    const gesture = touchGestureRef.current;
    touchGestureRef.current = null;
    if (
      isNormalEnd &&
      gesture &&
      gesture.mode !== "scroll" &&
      shouldSuppressClickAfterTouchHold(
        Date.now() - gesture.startTime,
        gesture.maxDistance
      )
    ) {
      suppressClickUntilRef.current = Date.now() + 450;
    }
    resetInteraction();
    if (runtimeRef.current.isActive) {
      runtimeRef.current.onActiveChange(null);
    }
  }

  // Scoped native touch listeners on this print button only:
  // - touchstart is passive (never calls preventDefault; quick taps & vertical scrolls stay native)
  // - touchmove only calls preventDefault() once press-and-hold flashlight mode is locked,
  //   preventing mobile browsers from aborting an active flashlight glide via pointercancel.
  useEffect(() => {
    const button = buttonRef.current;
    if (!button) {
      return;
    }

    const onTouchStart = (event: globalThis.TouchEvent) => {
      if (event.touches.length > 1) {
        if (touchGestureRef.current) {
          touchGestureRef.current.mode = "scroll";
        }
        resetInteraction();
        return;
      }
      const touch = event.touches[0];
      if (!touch) {
        return;
      }
      if (!touchGestureRef.current) {
        startTouchGesture(touch.clientX, touch.clientY);
      }
    };

    const onTouchMove = (event: globalThis.TouchEvent) => {
      if (event.touches.length !== 1) {
        if (touchGestureRef.current) {
          touchGestureRef.current.mode = "scroll";
        }
        resetInteraction();
        return;
      }
      const gesture = touchGestureRef.current;
      const touch = event.touches[0];
      if (!gesture || !touch) {
        return;
      }

      const deltaX = touch.clientX - gesture.startX;
      const deltaY = touch.clientY - gesture.startY;
      const distance = Math.hypot(deltaX, deltaY);
      const nextMode = resolveTouchFlashlightMode({
        currentMode: gesture.mode,
        elapsedMs: Date.now() - gesture.startTime,
        deltaX,
        deltaY,
        priorMaxDistancePx: gesture.maxDistance,
        touchCount: event.touches.length,
      });

      if (distance > gesture.maxDistance) {
        gesture.maxDistance = distance;
      }
      gesture.mode = nextMode;

      if (nextMode === "scroll") {
        resetInteraction();
        return;
      }

      if (nextMode === "flashlight") {
        clearHoldTimer();
        if (event.cancelable) {
          event.preventDefault();
        }
      }

      scheduleSpotlightUpdate(touch.clientX, touch.clientY, "touch");
    };

    const onTouchEnd = (event: globalThis.TouchEvent) => {
      if (event.touches.length === 0) {
        finishTouchGesture(true);
      }
    };

    const onTouchCancel = () => {
      finishTouchGesture(false);
    };

    button.addEventListener("touchstart", onTouchStart, { passive: true });
    button.addEventListener("touchmove", onTouchMove, { passive: false });
    button.addEventListener("touchend", onTouchEnd, { passive: true });
    button.addEventListener("touchcancel", onTouchCancel, { passive: true });

    return () => {
      button.removeEventListener("touchstart", onTouchStart);
      button.removeEventListener("touchmove", onTouchMove);
      button.removeEventListener("touchend", onTouchEnd);
      button.removeEventListener("touchcancel", onTouchCancel);
      clearHoldTimer();
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
    // Listeners bind once per mounted print and read fresh callbacks via runtimeRef.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handlePointerEnter(event: PointerEvent<HTMLButtonElement>) {
    if (event.pointerType !== "mouse") {
      return;
    }

    onActiveChange(photo.id);

    if (enableFlashlight) {
      // Position the beam immediately at the entry point so there is no jump.
      updateSpotlightAndTilt(event.clientX, event.clientY, "hover");
    }
  }

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (event.pointerType === "mouse") {
      return;
    }

    // Illuminate a localized circular flashlight directly above touch/pen input
    // without calling preventDefault() so vertical scrolling and quick taps remain native.
    startTouchGesture(event.clientX, event.clientY);
  }

  function handlePointerMove(event: PointerEvent<HTMLButtonElement>) {
    if (event.pointerType === "mouse") {
      if (!enableFlashlight) {
        return;
      }
      scheduleSpotlightUpdate(event.clientX, event.clientY, "hover");
      return;
    }

    if (touchActiveRef.current) {
      const gesture = touchGestureRef.current;
      if (gesture) {
        const deltaX = event.clientX - gesture.startX;
        const deltaY = event.clientY - gesture.startY;
        const dist = Math.hypot(deltaX, deltaY);
        const nextMode = resolveTouchFlashlightMode({
          currentMode: gesture.mode,
          elapsedMs: Date.now() - gesture.startTime,
          deltaX,
          deltaY,
          priorMaxDistancePx: gesture.maxDistance,
          touchCount: 1,
        });
        if (dist > gesture.maxDistance) {
          gesture.maxDistance = dist;
        }
        gesture.mode = nextMode;
        if (nextMode === "scroll") {
          resetInteraction();
          return;
        }
      }
      scheduleSpotlightUpdate(event.clientX, event.clientY, "touch");
    }
  }

  function handlePointerUpOrCancel(event: PointerEvent<HTMLButtonElement>) {
    if (event.pointerType === "mouse") {
      return;
    }
    finishTouchGesture(event.type === "pointerup");
  }

  function handlePointerLeave(event: PointerEvent<HTMLButtonElement>) {
    if (event.pointerType !== "mouse" && touchActiveRef.current) {
      return;
    }
    clearHoldTimer();
    touchGestureRef.current = null;
    resetInteraction();
    if (isActive) {
      onActiveChange(null);
    }
  }

  function handleContextMenu(event: MouseEvent<HTMLElement>) {
    event.preventDefault();
  }

  function handleDragStart(event: DragEvent<HTMLElement>) {
    event.preventDefault();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Enter" || event.key === " ") {
      suppressClickUntilRef.current = 0;
    }
  }

  function handleClick() {
    if (suppressClickUntilRef.current > Date.now()) {
      suppressClickUntilRef.current = 0;
      return;
    }
    suppressClickUntilRef.current = 0;
    buttonRef.current?.focus({ preventScroll: true });
    onSelect(photo.id);
  }

  return (
    <div
      className="light-table-print-item flex shrink-0 flex-col"
      onContextMenu={handleContextMenu}
      onDragStart={handleDragStart}
    >
      <button
        ref={(node) => {
          buttonRef.current = node;
          registerButtonRef(photo.id, node);
        }}
        type="button"
        draggable={false}
        data-active={isActive ? "true" : "false"}
        data-selected={isSelected ? "true" : "false"}
        aria-label={`Inspect photograph ${photo.catalogId}`}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onContextMenu={handleContextMenu}
        onDragStart={handleDragStart}
        onPointerEnter={handlePointerEnter}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUpOrCancel}
        onPointerCancel={handlePointerUpOrCancel}
        onPointerLeave={handlePointerLeave}
        onFocus={() => onActiveChange(photo.id)}
        onBlur={() => {
          clearHoldTimer();
          touchGestureRef.current = null;
          resetInteraction();
          if (isActive) {
            onActiveChange(null);
          }
        }}
        className="light-table-print cursor-pointer"
      >
        <span ref={frameRef} className="light-table-print-frame">
          {imageError ? (
            <span className="flex h-full w-full flex-col items-center justify-center bg-chamber px-3 text-center font-mono text-[10px] tracking-[0.14em] text-ink-dim uppercase">
              <span>{photo.catalogId}</span>
              <span className="mt-1 opacity-70">Unavailable</span>
            </span>
          ) : (
            <>
              {/* Base dimmed photograph: retains original colour at darkroom exposure */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.src}
                alt={photo.altText}
                width={photo.width}
                height={photo.height}
                loading="lazy"
                decoding="async"
                draggable={false}
                onError={() => setImageError(true)}
                className="light-table-print-base"
              />
              {/* Illuminated identical layer: revealed strictly via pointer radial mask */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.src}
                alt=""
                aria-hidden="true"
                width={photo.width}
                height={photo.height}
                loading="lazy"
                decoding="async"
                draggable={false}
                className="light-table-print-lit"
              />
            </>
          )}
        </span>
      </button>

      <span className="light-table-print-label mt-2 font-mono text-[10px] tracking-[0.14em] text-ink-muted">
        {photo.catalogId}
      </span>
    </div>
  );
}

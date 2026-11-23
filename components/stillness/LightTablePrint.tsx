"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import type { StillnessClientPhoto } from "@/content/artifacts/stillness";
import {
  computeFlashlightRadius,
  computeFlashlightSpotlight,
  computePrintTilt,
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
  const pendingPointerRef = useRef<{ x: number; y: number } | null>(null);
  const [imageError, setImageError] = useState(false);

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

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  function updateSpotlightAndTilt(clientX: number, clientY: number) {
    const button = buttonRef.current;
    const frame = frameRef.current;
    if (!button || !frame) {
      return;
    }

    const frameRect = frame.getBoundingClientRect();
    const spotlight = computeFlashlightSpotlight(clientX, clientY, frameRect, {
      finePointer: true,
    });

    frame.style.setProperty("--spot-x", `${spotlight.x}px`);
    frame.style.setProperty("--spot-y", `${spotlight.y}px`);
    frame.style.setProperty("--spot-radius", `${spotlight.radius}px`);
    frame.style.setProperty("--spot-opacity", spotlight.active ? "1" : "0");

    if (enableTilt) {
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
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    pendingPointerRef.current = null;

    const button = buttonRef.current;
    if (button) {
      button.style.setProperty("--tilt-x", "0deg");
      button.style.setProperty("--tilt-y", "0deg");
    }

    // Fade out at the pointer's last coordinates to avoid any snap on leave.
    const frame = frameRef.current;
    if (frame) {
      frame.style.setProperty("--spot-opacity", "0");
    }
  }

  function handlePointerEnter(event: PointerEvent<HTMLButtonElement>) {
    if (event.pointerType !== "mouse") {
      return;
    }

    onActiveChange(photo.id);

    if (enableFlashlight) {
      // Position the beam immediately at the entry point so there is no jump.
      updateSpotlightAndTilt(event.clientX, event.clientY);
    }
  }

  function handlePointerMove(event: PointerEvent<HTMLButtonElement>) {
    if (!enableFlashlight || event.pointerType !== "mouse") {
      return;
    }

    pendingPointerRef.current = { x: event.clientX, y: event.clientY };

    if (rafRef.current !== null) {
      return;
    }

    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      const point = pendingPointerRef.current;
      if (!point) {
        return;
      }
      updateSpotlightAndTilt(point.x, point.y);
    });
  }

  function handlePointerLeave() {
    resetInteraction();
    if (isActive) {
      onActiveChange(null);
    }
  }

  function handleClick() {
    buttonRef.current?.focus({ preventScroll: true });
    onSelect(photo.id);
  }

  return (
    <div className="flex shrink-0 flex-col">
      <button
        ref={(node) => {
          buttonRef.current = node;
          registerButtonRef(photo.id, node);
        }}
        type="button"
        data-active={isActive ? "true" : "false"}
        data-selected={isSelected ? "true" : "false"}
        aria-label={`Inspect photograph ${photo.catalogId}`}
        onClick={handleClick}
        onPointerEnter={handlePointerEnter}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onFocus={() => onActiveChange(photo.id)}
        onBlur={() => {
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

      <span className="mt-2 font-mono text-[10px] tracking-[0.14em] text-ink-muted">
        {photo.catalogId}
      </span>
    </div>
  );
}

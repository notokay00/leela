"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import type { StillnessClientPhoto } from "@/content/artifacts/stillness";
import { computePrintTilt } from "@/lib/stillness/light-table";

export interface LightTablePrintProps {
  photo: StillnessClientPhoto;
  width: number;
  height: number;
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
  enableTilt,
  isActive,
  isSelected,
  onActiveChange,
  onSelect,
  registerButtonRef,
}: LightTablePrintProps) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const pendingPointerRef = useRef<{ x: number; y: number } | null>(null);
  const [imageError, setImageError] = useState(false);

  // Apply justified pixel dimensions via CSSOM (no SSR style="" attribute, strict nonce CSP safe).
  useLayoutEffect(() => {
    const node = buttonRef.current;
    if (!node) {
      return;
    }
    node.style.width = `${width}px`;
    node.style.height = `${height}px`;
  }, [width, height]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  function resetTilt() {
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    pendingPointerRef.current = null;

    const node = buttonRef.current;
    if (!node) {
      return;
    }
    node.style.setProperty("--tilt-x", "0deg");
    node.style.setProperty("--tilt-y", "0deg");
    node.style.setProperty("--print-light-x", "50%");
    node.style.setProperty("--print-light-y", "35%");
  }

  function handlePointerMove(event: PointerEvent<HTMLButtonElement>) {
    if (!enableTilt || event.pointerType !== "mouse") {
      return;
    }

    pendingPointerRef.current = { x: event.clientX, y: event.clientY };

    if (rafRef.current !== null) {
      return;
    }

    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      const node = buttonRef.current;
      const point = pendingPointerRef.current;
      if (!node || !point) {
        return;
      }

      const rect = node.getBoundingClientRect();
      const { rotateX, rotateY } = computePrintTilt(point.x, point.y, rect, {
        finePointer: true,
        reducedMotion: false,
      });

      const pctX = Math.round(((point.x - rect.left) / rect.width) * 100);
      const pctY = Math.round(((point.y - rect.top) / rect.height) * 100);

      node.style.setProperty("--tilt-x", `${rotateX}deg`);
      node.style.setProperty("--tilt-y", `${rotateY}deg`);
      node.style.setProperty("--print-light-x", `${pctX}%`);
      node.style.setProperty("--print-light-y", `${pctY}%`);
    });
  }

  function handlePointerEnter(event: PointerEvent<HTMLButtonElement>) {
    if (event.pointerType === "mouse") {
      onActiveChange(photo.id);
    }
  }

  function handlePointerLeave() {
    resetTilt();
    if (isActive) {
      onActiveChange(null);
    }
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
        onClick={() => onSelect(photo.id)}
        onPointerEnter={handlePointerEnter}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onFocus={() => onActiveChange(photo.id)}
        onBlur={() => {
          resetTilt();
          if (isActive) {
            onActiveChange(null);
          }
        }}
        className="light-table-print cursor-pointer"
      >
        <span className="light-table-print-frame">
          {imageError ? (
            <span className="flex h-full w-full flex-col items-center justify-center bg-chamber px-3 text-center font-mono text-[10px] tracking-[0.14em] text-ink-dim uppercase">
              <span>{photo.catalogId}</span>
              <span className="mt-1 opacity-70">Unavailable</span>
            </span>
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={photo.src}
              alt={photo.altText}
              width={photo.width}
              height={photo.height}
              loading="lazy"
              decoding="async"
              onError={() => setImageError(true)}
              className="block h-full w-full object-contain select-none"
            />
          )}
          <span aria-hidden="true" className="light-table-print-sheen" />
        </span>
      </button>

      <span className="mt-2 font-mono text-[10px] tracking-[0.14em] text-ink-muted">
        {photo.catalogId}
      </span>
    </div>
  );
}

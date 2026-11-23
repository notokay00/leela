"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { StillnessClientPhoto } from "@/content/artifacts/stillness";
import { computeJustifiedRows } from "@/lib/stillness/layout";
import { LightTablePrint } from "./LightTablePrint";

export interface JustifiedContactGridProps {
  photos: readonly StillnessClientPhoto[];
  enableTilt: boolean;
  activePhotoId: string | null;
  selectedPhotoId: string | null;
  onActiveChange: (photoId: string | null) => void;
  onSelect: (photoId: string) => void;
  registerButtonRef: (photoId: string, node: HTMLButtonElement | null) => void;
}

const DESKTOP_GAP = 18;
const MOBILE_GAP = 12;

export function JustifiedContactGrid({
  photos,
  enableTilt,
  activePhotoId,
  selectedPhotoId,
  onActiveChange,
  onSelect,
  registerButtonRef,
}: JustifiedContactGridProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(960);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) {
      return;
    }

    const measure = () => {
      const nextWidth = Math.floor(node.getBoundingClientRect().width);
      if (nextWidth > 0) {
        setContainerWidth(nextWidth);
      }
    };

    measure();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = Math.floor(entry.contentRect.width);
        if (width > 0) {
          setContainerWidth(width);
        }
      }
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const isCompact = containerWidth < 640;
  const gap = isCompact ? MOBILE_GAP : DESKTOP_GAP;

  const rows = useMemo(
    () =>
      computeJustifiedRows(photos, {
        containerWidth,
        gap,
      }),
    [photos, containerWidth, gap]
  );

  return (
    <div
      ref={containerRef}
      data-has-active={activePhotoId ? "true" : "false"}
      className="light-table-grid flex w-full flex-col gap-7 sm:gap-9"
    >
      {rows.map((row, rowIndex) => (
        <div
          key={`row-${rowIndex}-${row.items[0]?.photo.id ?? "empty"}`}
          data-complete-row={row.isComplete ? "true" : "false"}
          className={
            isCompact
              ? "flex w-full items-start gap-3"
              : "flex w-full items-start gap-[18px]"
          }
        >
          {row.items.map((item) => (
            <LightTablePrint
              key={item.photo.id}
              photo={item.photo}
              width={item.width}
              height={item.height}
              enableTilt={enableTilt}
              isActive={activePhotoId === item.photo.id}
              isSelected={selectedPhotoId === item.photo.id}
              onActiveChange={onActiveChange}
              onSelect={onSelect}
              registerButtonRef={registerButtonRef}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

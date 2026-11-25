"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import type { StillnessClientPhoto } from "@/content/artifacts/stillness";
import { cn } from "@/lib/cn";
import {
  groupPhotosChronologically,
  parseGenuineCaptureDate,
} from "@/lib/stillness/chronology";
import { computeTableLightPosition } from "@/lib/stillness/light-table";
import { JustifiedContactGrid } from "./JustifiedContactGrid";
import { StillnessViewer } from "./StillnessViewer";

export type StillnessMode = "contact-sheet" | "chronology";

export interface StillnessRoomProps {
  photos: readonly StillnessClientPhoto[];
  isTestHarness?: boolean;
}

export function StillnessRoom({
  photos,
  isTestHarness = false,
}: StillnessRoomProps) {
  const [mode, setMode] = useState<StillnessMode>("contact-sheet");
  const [activePhotoId, setActivePhotoId] = useState<string | null>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [capabilities, setCapabilities] = useState({
    finePointer: false,
    reducedMotion: true,
  });

  const tableRef = useRef<HTMLDivElement | null>(null);
  const lightRafRef = useRef<number | null>(null);
  const pendingLightPointRef = useRef<{ x: number; y: number } | null>(null);
  const thumbnailRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const originatingPhotoIdRef = useRef<string | null>(null);

  useEffect(() => {
    const fineMq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reducedMq = window.matchMedia("(prefers-reduced-motion: reduce)");

    const update = () => {
      setCapabilities({
        finePointer: fineMq.matches,
        reducedMotion: reducedMq.matches,
      });
    };

    update();
    fineMq.addEventListener("change", update);
    reducedMq.addEventListener("change", update);

    return () => {
      fineMq.removeEventListener("change", update);
      reducedMq.removeEventListener("change", update);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (lightRafRef.current !== null) {
        window.cancelAnimationFrame(lightRafRef.current);
      }
    };
  }, []);

  const enableFlashlight = capabilities.finePointer;
  const enableLivingLight =
    capabilities.finePointer && !capabilities.reducedMotion;

  const hasRecordedDates = useMemo(
    () =>
      photos.some(
        (photo) => parseGenuineCaptureDate(photo.capturedAt) !== null
      ),
    [photos]
  );

  const effectiveMode: StillnessMode = hasRecordedDates
    ? mode
    : "contact-sheet";

  const chronologyGroups = useMemo(
    () => groupPhotosChronologically(photos),
    [photos]
  );

  // Ordered flat photo list matching the active browsing mode so Next/Previous
  // in the viewer matches the visitor's visual reading order.
  const viewerPhotos = useMemo<readonly StillnessClientPhoto[]>(() => {
    if (effectiveMode === "contact-sheet") {
      return photos;
    }
    return chronologyGroups.flatMap((group) =>
      group.items.map((item) => item.photo)
    );
  }, [chronologyGroups, effectiveMode, photos]);

  const registerButtonRef = useCallback(
    (photoId: string, node: HTMLButtonElement | null) => {
      if (node) {
        thumbnailRefs.current.set(photoId, node);
      } else {
        thumbnailRefs.current.delete(photoId);
      }
    },
    []
  );

  const openViewerForPhoto = useCallback(
    (photoId: string) => {
      const idx = viewerPhotos.findIndex((p) => p.id === photoId);
      if (idx === -1) {
        return;
      }
      originatingPhotoIdRef.current = photoId;
      setViewerIndex(idx);
    },
    [viewerPhotos]
  );

  const closeViewer = useCallback(() => {
    const returnId =
      (viewerIndex !== null ? viewerPhotos[viewerIndex]?.id : null) ??
      originatingPhotoIdRef.current;
    setViewerIndex(null);
    setActivePhotoId(null);

    if (returnId) {
      window.requestAnimationFrame(() => {
        thumbnailRefs.current.get(returnId)?.focus();
      });
    }
  }, [viewerIndex, viewerPhotos]);

  function handleTablePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!enableLivingLight || event.pointerType !== "mouse") {
      return;
    }

    pendingLightPointRef.current = { x: event.clientX, y: event.clientY };

    if (lightRafRef.current !== null) {
      return;
    }

    lightRafRef.current = window.requestAnimationFrame(() => {
      lightRafRef.current = null;
      const table = tableRef.current;
      const point = pendingLightPointRef.current;
      if (!table || !point) {
        return;
      }

      const rect = table.getBoundingClientRect();
      const pos = computeTableLightPosition(point.x, point.y, rect);

      table.style.setProperty("--table-light-x", `${pos.x}px`);
      table.style.setProperty("--table-light-y", `${pos.y}px`);
      table.style.setProperty(
        "--table-light-opacity",
        pos.inside ? "1" : "0"
      );
    });
  }

  function handleTablePointerLeave() {
    if (lightRafRef.current !== null) {
      window.cancelAnimationFrame(lightRafRef.current);
      lightRafRef.current = null;
    }
    pendingLightPointRef.current = null;
    tableRef.current?.style.setProperty("--table-light-opacity", "0");
    setActivePhotoId(null);
  }

  const selectedPhotoId =
    viewerIndex !== null ? (viewerPhotos[viewerIndex]?.id ?? null) : null;

  return (
    <div className="stillness-content mx-auto w-full max-w-[var(--max-width-gallery)]">
      {isTestHarness && (
        <div
          role="note"
          className="mb-6 border-b border-hairline pb-2 font-mono text-[10px] tracking-[0.22em] text-ink-secondary uppercase"
        >
          TEST FIXTURES — NOT ARCHIVE CONTENT
        </div>
      )}

      {/* Quiet room title & restrained single-mode switcher */}
      <div className="mb-7 flex flex-col gap-4 sm:mb-9 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-normal tracking-[0.04em] text-ink sm:text-[1.95rem]">
            Stillness
          </h1>
          <p className="mt-1.5 font-mono text-[10px] tracking-[0.18em] text-ink-dim uppercase">
            {photos.length === 0
              ? "STILLNESS · 0 photographs"
              : `STILLNESS · ${photos.length} ${photos.length === 1 ? "photograph" : "photographs"}`}
          </p>
        </div>

        {photos.length > 0 && hasRecordedDates && (
          <div
            role="group"
            aria-label="Stillness browsing mode"
            className="flex items-center gap-6"
          >
            <button
              type="button"
              aria-pressed={effectiveMode === "contact-sheet"}
              onClick={() => {
                setMode("contact-sheet");
                setActivePhotoId(null);
              }}
              className={cn(
                "threshold-control cursor-pointer border-b pb-1 font-mono text-[10px] tracking-[0.2em] uppercase",
                effectiveMode === "contact-sheet"
                  ? "border-ink-secondary text-ink"
                  : "border-transparent text-ink-dim hover:text-ink-secondary"
              )}
            >
              Contact Sheet
            </button>

            <button
              type="button"
              aria-pressed={effectiveMode === "chronology"}
              onClick={() => {
                setMode("chronology");
                setActivePhotoId(null);
              }}
              className={cn(
                "threshold-control cursor-pointer border-b pb-1 font-mono text-[10px] tracking-[0.2em] uppercase",
                effectiveMode === "chronology"
                  ? "border-ink-secondary text-ink"
                  : "border-transparent text-ink-dim hover:text-ink-secondary"
              )}
            >
              Chronology
            </button>
          </div>
        )}
      </div>

      {/* The Living Light Table surface — barely emerging from the #08090B studio */}
      <section
        ref={tableRef}
        aria-label="Stillness light table"
        data-viewer-open={viewerIndex !== null ? "true" : "false"}
        onPointerMove={handleTablePointerMove}
        onPointerLeave={handleTablePointerLeave}
        className="light-table-plane -mx-1 px-2.5 py-7 sm:mx-0 sm:px-7 sm:py-10"
      >
        <div aria-hidden="true" className="light-table-glow" />

        <div className="relative z-[1]">
          {photos.length === 0 ? (
            <div className="flex min-h-[42vh] flex-col items-center justify-center py-16 text-center">
              <p className="font-serif text-lg text-ink-secondary italic">
                No photographs are available here yet.
              </p>
            </div>
          ) : effectiveMode === "contact-sheet" ? (
            <JustifiedContactGrid
              photos={photos}
              enableFlashlight={enableFlashlight}
              enableTilt={enableLivingLight}
              activePhotoId={activePhotoId}
              selectedPhotoId={selectedPhotoId}
              onActiveChange={setActivePhotoId}
              onSelect={openViewerForPhoto}
              registerButtonRef={registerButtonRef}
            />
          ) : (
            <div className="flex flex-col gap-12 sm:gap-16">
              {chronologyGroups.map((group) => (
                <section
                  key={group.key}
                  aria-labelledby={`chronology-group-${group.key}`}
                  className="flex flex-col gap-6"
                >
                  <h2
                    id={`chronology-group-${group.key}`}
                    className="border-b border-hairline pb-2.5 font-mono text-xs tracking-[0.22em] text-ink-secondary uppercase"
                  >
                    {group.label}
                  </h2>

                  <JustifiedContactGrid
                    photos={group.items.map((item) => item.photo)}
                    enableFlashlight={enableFlashlight}
                    enableTilt={false}
                    activePhotoId={activePhotoId}
                    selectedPhotoId={selectedPhotoId}
                    onActiveChange={setActivePhotoId}
                    onSelect={openViewerForPhoto}
                    registerButtonRef={registerButtonRef}
                  />
                </section>
              ))}
            </div>
          )}
        </div>
      </section>

      {viewerIndex !== null && (
        <StillnessViewer
          photos={viewerPhotos}
          currentIndex={viewerIndex}
          onNavigate={setViewerIndex}
          onClose={closeViewer}
        />
      )}
    </div>
  );
}

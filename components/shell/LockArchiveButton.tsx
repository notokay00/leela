"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAudio } from "@/components/audio/AudioProvider";
import { cn } from "@/lib/cn";

export function LockArchiveButton({
  className,
  tone = "dark",
}: {
  className?: string;
  tone?: "dark" | "light";
}) {
  const router = useRouter();
  const { enterInSilence } = useAudio();
  const [locking, setLocking] = useState(false);

  async function handleLock() {
    if (locking) {
      return;
    }
    setLocking(true);
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

  return (
    <button
      type="button"
      onClick={handleLock}
      disabled={locking}
      className={cn(
        "threshold-control cursor-pointer font-mono text-[11px] tracking-[0.2em] uppercase",
        tone === "light"
          ? "text-paper-ink-secondary hover:text-paper-ink"
          : "text-ink-dim hover:text-ink",
        locking && "cursor-wait opacity-50",
        className
      )}
    >
      {locking ? "Locking…" : "Lock"}
    </button>
  );
}

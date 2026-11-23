"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import {
  canSubmitPassphrase,
  createInitialThresholdState,
  resolveEntryAudioAction,
  resolveUnlockResponse,
  type ThresholdState,
} from "@/lib/threshold/state";

export interface ThresholdExperienceProps {
  initialAuthenticated: boolean;
  audioAvailable: boolean;
}

const ENTRY_AUDIO_STORAGE_KEY = "archive:entry-audio";

export function ThresholdExperience({
  initialAuthenticated,
  audioAvailable,
}: ThresholdExperienceProps) {
  const router = useRouter();
  const [state, setState] = useState<ThresholdState>(() =>
    createInitialThresholdState(initialAuthenticated)
  );
  const [passphrase, setPassphrase] = useState("");
  const [isNavigating, setIsNavigating] = useState(false);

  const submittingRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep the composition centered in the usable mobile viewport when the
  // virtual keyboard opens (including iOS Safari where 100dvh may not shrink).
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) {
      return;
    }

    const syncViewportHeight = () => {
      document.documentElement.style.setProperty(
        "--threshold-vh",
        `${Math.round(vv.height)}px`
      );
    };

    syncViewportHeight();
    vv.addEventListener("resize", syncViewportHeight);
    vv.addEventListener("scroll", syncViewportHeight);

    return () => {
      vv.removeEventListener("resize", syncViewportHeight);
      vv.removeEventListener("scroll", syncViewportHeight);
      document.documentElement.style.removeProperty("--threshold-vh");
    };
  }, []);

  // Move focus quietly when transitioning into the rejected or accepted states.
  useEffect(() => {
    if (state.status === "rejected") {
      inputRef.current?.focus();
    }
  }, [state.status]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submittingRef.current || !canSubmitPassphrase(state.status, passphrase)) {
      return;
    }

    submittingRef.current = true;
    const submittedValue = passphrase;

    setState({
      status: "pending",
      rejectionMessage: null,
      audioFallbackNotice: null,
    });

    try {
      const response = await fetch("/api/auth/unlock", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({ passphrase: submittedValue }),
      });

      const nextState = resolveUnlockResponse(response.status, response.ok);
      if (nextState.status === "accepted") {
        setPassphrase("");
      } else {
        setPassphrase("");
      }
      setState(nextState);
    } catch {
      setPassphrase("");
      setState({
        status: "rejected",
        rejectionMessage: "Unable to verify right now.",
        audioFallbackNotice: null,
      });
    } finally {
      submittingRef.current = false;
    }
  }

  function handleEntryChoice(choice: "sound" | "silence") {
    if (isNavigating) {
      return;
    }

    const action = resolveEntryAudioAction(choice, audioAvailable);
    setIsNavigating(true);

    try {
      window.sessionStorage.setItem(ENTRY_AUDIO_STORAGE_KEY, action.mode);
    } catch {
      // Ignore storage restrictions in private browsing modes.
    }

    if (action.notice) {
      setState((prev) => ({
        ...prev,
        audioFallbackNotice: action.notice,
      }));
      window.setTimeout(() => {
        router.push("/archive");
      }, 900);
      return;
    }

    router.push("/archive");
  }

  const isPending = state.status === "pending";
  const isAccepted = state.status === "accepted";

  return (
    <main className="threshold-stage threshold-reveal flex flex-col items-center justify-center bg-void text-ink">
      <div className="flex w-full max-w-md flex-col items-center text-center">
        <h1 className="threshold-title font-serif font-normal tracking-[0.26em] text-ink uppercase">
          The Archive of Us
        </h1>

        <div className="mt-12 w-full max-w-[17rem]">
          {!isAccepted ? (
            <form
              onSubmit={handleSubmit}
              noValidate
              aria-busy={isPending}
              className="threshold-fade flex flex-col items-center"
            >
              <label htmlFor="archive-passphrase" className="sr-only">
                Passphrase
              </label>

              <input
                ref={inputRef}
                id="archive-passphrase"
                name="passphrase"
                type="password"
                value={passphrase}
                onChange={(event) => {
                  setPassphrase(event.target.value);
                  if (state.status === "rejected") {
                    setState((prev) => ({
                      ...prev,
                      rejectionMessage: null,
                    }));
                  }
                }}
                disabled={isPending}
                autoComplete="current-password"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="go"
                placeholder="passphrase"
                aria-describedby="threshold-status-message"
                className={cn(
                  "threshold-control w-full border-0 border-b border-hairline bg-transparent px-1 py-2.5 text-center font-sans text-sm tracking-[0.14em] text-ink placeholder:text-ink-dim",
                  "focus:border-hairline-strong focus:outline-none focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-focus",
                  isPending && "cursor-wait opacity-40"
                )}
              />

              <p
                id="threshold-status-message"
                role="status"
                aria-live="polite"
                className="mt-5 min-h-[1.25rem] font-sans text-xs tracking-[0.06em] text-ink-dim"
              >
                {isPending ? "Verifying…" : (state.rejectionMessage ?? "")}
              </p>
            </form>
          ) : (
            <div className="threshold-reveal flex flex-col items-center">
              <span className="sr-only" role="status" aria-live="polite">
                Passphrase accepted. Choose with sound or in silence.
              </span>
              <div
                role="group"
                aria-label="Choose how to enter the archive"
                className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4"
              >
                <button
                  type="button"
                  disabled={isNavigating}
                  onClick={() => handleEntryChoice("sound")}
                  className={cn(
                    "threshold-control cursor-pointer bg-transparent px-2 py-1.5 font-serif text-lg italic tracking-[0.04em] text-ink-secondary hover:text-ink",
                    isNavigating && "cursor-wait opacity-50"
                  )}
                >
                  with sound
                </button>

                <button
                  type="button"
                  disabled={isNavigating}
                  onClick={() => handleEntryChoice("silence")}
                  className={cn(
                    "threshold-control cursor-pointer bg-transparent px-2 py-1.5 font-serif text-lg italic tracking-[0.04em] text-ink-secondary hover:text-ink",
                    isNavigating && "cursor-wait opacity-50"
                  )}
                >
                  in silence
                </button>
              </div>

              <p
                role="status"
                aria-live="polite"
                className="mt-6 min-h-[1.25rem] font-sans text-xs tracking-[0.04em] text-ink-dim"
              >
                {state.audioFallbackNotice ?? ""}
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

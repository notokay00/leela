"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAudio } from "@/components/audio/AudioProvider";
import { cn } from "@/lib/cn";
import {
  canSubmitPassphrase,
  createInitialThresholdState,
  resolveEntryAudioAction,
  resolveUnlockResponse,
  type ThresholdState,
} from "@/lib/threshold/state";
import { ThresholdWillowBackdrop } from "./ThresholdWillowBackdrop";

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
  const { enterWithSound, enterInSilence } = useAudio();
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

    if (action.shouldInitiateAudio) {
      enterWithSound();
      router.push("/archive");
      return;
    }

    enterInSilence();

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
  const isRejected = state.status === "rejected" && Boolean(state.rejectionMessage);

  return (
    <main className="threshold-stage threshold-storybook threshold-reveal relative flex flex-col items-center justify-center overflow-hidden">
      <ThresholdWillowBackdrop />

      <div className="threshold-foreground relative z-10 flex w-full max-w-md flex-col items-center text-center">
        <h1 className="threshold-title threshold-storybook-title font-serif font-medium tracking-[0.26em] text-[#181d17] uppercase">
          The Archive of Us
        </h1>

        <div className="mt-8 w-full max-w-[17.5rem] sm:mt-9">
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
                aria-invalid={isRejected ? "true" : undefined}
                aria-describedby="threshold-status-message"
                className={cn(
                  "threshold-control threshold-storybook-input w-full rounded-[3px] border border-[#242c22]/12 border-b-[#1b221a]/75 bg-[#fdfbf6]/72 px-3 py-2.5 text-center font-sans text-sm tracking-[0.14em] text-[#181d17] backdrop-blur-[5px] placeholder:text-[#343931]",
                  "focus:border-[#181d17]/40 focus:border-b-[#181d17] focus:bg-[#fdfbf6]/90 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#181d17]",
                  isRejected &&
                    "border-[#7a1e17]/35 border-b-[#7a1e17] bg-[#fff8f6]/88",
                  isPending && "cursor-wait opacity-55"
                )}
              />

              <p
                id="threshold-status-message"
                role="status"
                aria-live="polite"
                className={cn(
                  "threshold-status-text mt-4 min-h-[1.35rem] font-sans text-xs font-medium tracking-[0.05em]",
                  isRejected ? "text-[#7a1e17]" : "text-[#2c3329]"
                )}
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
                className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3"
              >
                <button
                  type="button"
                  disabled={isNavigating}
                  onClick={() => handleEntryChoice("sound")}
                  className={cn(
                    "threshold-control threshold-storybook-choice cursor-pointer rounded-[2px] bg-[#fdfbf6]/48 px-3.5 py-1.5 font-serif text-lg italic tracking-[0.04em] text-[#222921] backdrop-blur-[3px] hover:bg-[#fdfbf6]/78 hover:text-[#111510] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#181d17]",
                    isNavigating && "cursor-wait opacity-55"
                  )}
                >
                  with sound
                </button>

                <button
                  type="button"
                  disabled={isNavigating}
                  onClick={() => handleEntryChoice("silence")}
                  className={cn(
                    "threshold-control threshold-storybook-choice cursor-pointer rounded-[2px] bg-[#fdfbf6]/48 px-3.5 py-1.5 font-serif text-lg italic tracking-[0.04em] text-[#222921] backdrop-blur-[3px] hover:bg-[#fdfbf6]/78 hover:text-[#111510] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#181d17]",
                    isNavigating && "cursor-wait opacity-55"
                  )}
                >
                  in silence
                </button>
              </div>

              <p
                role="status"
                aria-live="polite"
                className="threshold-status-text mt-5 min-h-[1.35rem] font-sans text-xs font-medium tracking-[0.04em] text-[#2c3329]"
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

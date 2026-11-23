import { connection } from "next/server";
import { ThresholdExperience } from "@/components/threshold/ThresholdExperience";
import { isAuthorizedAudioConfigured } from "@/lib/audio/availability";
import { getSession } from "@/lib/auth/dal";

export default async function ThresholdPage() {
  // Opt into dynamic rendering so Next.js injects the fresh per-request CSP nonce.
  await connection();

  let isAuthenticated = false;
  try {
    isAuthenticated = (await getSession()) !== null;
  } catch {
    isAuthenticated = false;
  }

  const audioAvailable = isAuthorizedAudioConfigured();

  return (
    <ThresholdExperience
      initialAuthenticated={isAuthenticated}
      audioAvailable={audioAvailable}
    />
  );
}

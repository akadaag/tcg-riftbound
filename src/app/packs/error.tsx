"use client";

import { ErrorDisplay } from "@/components/ui/error-display";

export default function PacksError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorDisplay
      title="Packs Error"
      message={error.message || "Could not load packs. Please try again."}
      onRetry={reset}
    />
  );
}

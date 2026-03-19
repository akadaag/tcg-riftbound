"use client";

import { ErrorDisplay } from "@/components/ui/error-display";

export default function CollectionError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorDisplay
      title="Collection Error"
      message={
        error.message || "Could not load your collection. Please try again."
      }
      onRetry={reset}
    />
  );
}

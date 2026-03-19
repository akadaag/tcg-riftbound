"use client";

import { ErrorDisplay } from "@/components/ui/error-display";

export default function ShopError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorDisplay
      title="Shop Error"
      message={error.message || "Could not load the shop. Please try again."}
      onRetry={reset}
    />
  );
}

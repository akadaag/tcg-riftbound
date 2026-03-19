"use client";

/**
 * Reusable error display component for error.tsx and not-found.tsx pages.
 */

interface ErrorDisplayProps {
  title: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function ErrorDisplay({
  title,
  message,
  onRetry,
  retryLabel = "Try Again",
}: ErrorDisplayProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      {/* Icon */}
      <div className="bg-error/10 mb-4 flex h-16 w-16 items-center justify-center rounded-2xl">
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-error"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>

      <h2 className="mb-2 text-xl font-bold">{title}</h2>
      <p className="text-foreground-secondary mb-6 max-w-xs text-center text-sm">
        {message}
      </p>

      {onRetry && (
        <button
          onClick={onRetry}
          className="bg-accent-primary hover:bg-accent-primary-hover min-h-[44px] rounded-xl px-6 py-3 text-sm font-medium text-white transition-colors"
        >
          {retryLabel}
        </button>
      )}
    </div>
  );
}

export function NotFoundDisplay({
  title = "Page Not Found",
  message = "The page you're looking for doesn't exist or has been moved.",
}: {
  title?: string;
  message?: string;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      {/* Icon */}
      <div className="bg-warning/10 mb-4 flex h-16 w-16 items-center justify-center rounded-2xl">
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-warning"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
          <line x1="8" y1="11" x2="14" y2="11" />
        </svg>
      </div>

      <h2 className="mb-2 text-xl font-bold">{title}</h2>
      <p className="text-foreground-secondary mb-6 max-w-xs text-center text-sm">
        {message}
      </p>

      <a
        href="/"
        className="bg-accent-primary hover:bg-accent-primary-hover min-h-[44px] rounded-xl px-6 py-3 text-sm font-medium text-white transition-colors"
      >
        Back to Home
      </a>
    </div>
  );
}

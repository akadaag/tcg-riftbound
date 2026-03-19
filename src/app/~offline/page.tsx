"use client";

/**
 * Offline fallback page.
 * Shown when the user navigates to a page while offline
 * and it's not in the service worker cache.
 */
export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <div className="mb-4 text-6xl">
        <svg
          width="64"
          height="64"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-foreground-muted mx-auto"
        >
          <line x1="1" y1="1" x2="23" y2="23" />
          <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
          <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
          <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
          <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
          <line x1="12" y1="20" x2="12.01" y2="20" />
        </svg>
      </div>
      <h1 className="mb-2 text-xl font-bold">You&apos;re Offline</h1>
      <p className="text-foreground-secondary mb-6 max-w-xs text-sm">
        It looks like you&apos;ve lost your connection. The page you requested
        isn&apos;t cached yet. Please check your internet and try again.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="bg-accent-primary hover:bg-accent-primary-hover rounded-lg px-6 py-3 text-sm font-semibold text-white transition-colors"
      >
        Try Again
      </button>
    </div>
  );
}

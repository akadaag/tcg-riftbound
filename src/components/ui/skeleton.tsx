"use client";

/**
 * Reusable skeleton loading primitives for Riftbound Shop.
 * Use these to build route-level loading.tsx shimmer states.
 */

export function Skeleton({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`bg-card-border/60 animate-pulse rounded-xl ${className}`}
      {...props}
    />
  );
}

export function SkeletonText({
  lines = 1,
  className = "",
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton
          key={i}
          className="h-3 rounded-md"
          style={{ width: i === lines - 1 && lines > 1 ? "60%" : "100%" }}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div
      className={`border-card-border bg-card-background rounded-xl border p-4 ${className}`}
    >
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4 rounded-md" />
          <Skeleton className="h-3 w-1/2 rounded-md" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonStatCard() {
  return (
    <div className="border-card-border bg-card-background rounded-xl border p-3">
      <Skeleton className="mb-2 h-3 w-16 rounded-md" />
      <Skeleton className="h-6 w-20 rounded-md" />
    </div>
  );
}

/** Full-page loading shimmer matching the home dashboard layout */
export function DashboardSkeleton() {
  return (
    <div className="flex flex-1 flex-col px-4 pt-6 pb-4">
      {/* Header */}
      <div className="mb-6">
        <Skeleton className="mb-2 h-7 w-48 rounded-lg" />
        <Skeleton className="h-4 w-64 rounded-md" />
        <div className="mt-3">
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
      </div>

      {/* Stat cards */}
      <div className="mb-6 grid grid-cols-2 gap-3">
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
      </div>

      {/* Section */}
      <div className="mb-6">
        <Skeleton className="mb-3 h-5 w-24 rounded-md" />
        <SkeletonCard />
      </div>

      {/* Action buttons */}
      <div className="mb-6">
        <Skeleton className="mb-3 h-5 w-32 rounded-md" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-12 rounded-xl" />
          <Skeleton className="h-12 rounded-xl" />
          <Skeleton className="h-12 rounded-xl" />
          <Skeleton className="h-12 rounded-xl" />
        </div>
      </div>

      {/* End day button */}
      <Skeleton className="h-14 w-full rounded-xl" />
    </div>
  );
}

/** Loading shimmer for list-based pages (shop, supplier, etc.) */
export function ListPageSkeleton({ title = true }: { title?: boolean }) {
  return (
    <div className="flex flex-1 flex-col px-4 pt-6 pb-4">
      {title && (
        <div className="mb-6">
          <Skeleton className="mb-2 h-7 w-40 rounded-lg" />
          <Skeleton className="h-4 w-56 rounded-md" />
        </div>
      )}
      <div className="space-y-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}

/** Loading shimmer for grid-based pages (collection, packs) */
export function GridPageSkeleton() {
  return (
    <div className="flex flex-1 flex-col px-4 pt-6 pb-4">
      <div className="mb-6">
        <Skeleton className="mb-2 h-7 w-40 rounded-lg" />
        <Skeleton className="h-4 w-56 rounded-md" />
      </div>
      <div className="mb-6 grid grid-cols-3 gap-3">
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
      </div>
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 12 }, (_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

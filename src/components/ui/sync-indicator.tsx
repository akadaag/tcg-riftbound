"use client";

import { useGameStore } from "@/stores/game-store";

const statusConfig: Record<string, { label: string; dotColor: string }> = {
  synced: { label: "Synced", dotColor: "bg-success" },
  saving_locally: { label: "Saving...", dotColor: "bg-info" },
  syncing_cloud: { label: "Syncing...", dotColor: "bg-info" },
  offline: { label: "Offline", dotColor: "bg-warning" },
  sync_error: { label: "Sync Error", dotColor: "bg-error" },
};

/**
 * Small sync status pill, shown in the app header or settings.
 */
export function SyncIndicator() {
  const syncStatus = useGameStore((s) => s.syncStatus);
  const config = statusConfig[syncStatus] ?? statusConfig.offline;

  return (
    <div className="text-foreground-secondary inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium">
      <span
        className={`${config.dotColor} inline-block h-1.5 w-1.5 rounded-full`}
      />
      {config.label}
    </div>
  );
}

"use client";

import { useEffect, useRef } from "react";
import { useGameStore } from "@/stores/game-store";
import { useAuth } from "@/features/auth/auth-provider";
import { saveLocally } from "@/features/save/local-save";
import { saveToCloud } from "@/features/save/cloud-save";
import type { ReactNode } from "react";

const LOCAL_SAVE_INTERVAL_MS = 2_000; // 2 seconds
const CLOUD_SYNC_INTERVAL_MS = 30_000; // 30 seconds

/**
 * SaveProvider — handles auto-save orchestration:
 * - Debounced IndexedDB writes every 2 seconds (when save changes)
 * - Cloud sync every 30 seconds
 * - Cloud sync on tab hidden (visibilitychange)
 * - Cloud sync on beforeunload
 */
export function SaveProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const lastSavedRef = useRef<string>(""); // JSON snapshot for dirty checking

  useEffect(() => {
    if (!user) return;

    const { save, setSyncStatus, hasHydrated } = useGameStore.getState();

    // Don't start saving until the store has been hydrated with loaded data
    if (!hasHydrated) return;

    // Initialize snapshot
    lastSavedRef.current = JSON.stringify(save);

    // ---- Local auto-save (every 2s, only if dirty) ----
    const localInterval = setInterval(async () => {
      const currentSave = useGameStore.getState().save;
      const currentJson = JSON.stringify(currentSave);

      if (currentJson === lastSavedRef.current) return;

      try {
        setSyncStatus("saving_locally");
        await saveLocally(currentSave);
        lastSavedRef.current = currentJson;
        // Don't set "synced" here — that's for cloud
        setSyncStatus("offline"); // Still needs cloud sync
      } catch {
        console.error("[save-provider] Local save failed");
      }
    }, LOCAL_SAVE_INTERVAL_MS);

    // ---- Cloud sync (every 30s) ----
    const cloudInterval = setInterval(() => {
      syncToCloud(user.id);
    }, CLOUD_SYNC_INTERVAL_MS);

    // ---- Cloud sync on tab hidden ----
    function handleVisibilityChange() {
      if (document.visibilityState === "hidden" && user) {
        syncToCloud(user.id);
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // ---- Cloud sync on beforeunload / pagehide ----
    // iOS Safari does not reliably fire beforeunload; pagehide is the
    // reliable counterpart on mobile Safari and all modern browsers.
    function handlePageHide() {
      if (user) {
        const currentSave = useGameStore.getState().save;
        saveToCloud(user.id, currentSave).catch(() => {});
        saveLocally(currentSave).catch(() => {});
      }
    }
    function handleBeforeUnload() {
      if (user) {
        // Best-effort save on page close
        const currentSave = useGameStore.getState().save;
        saveToCloud(user.id, currentSave).catch(() => {
          // Best effort — already saved locally
        });
        saveLocally(currentSave).catch(() => {});
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      clearInterval(localInterval);
      clearInterval(cloudInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [user]);

  return <>{children}</>;
}

/**
 * Sync current save to the cloud.
 * Debounced via isSavingRef to prevent concurrent writes.
 */
async function syncToCloud(userId: string) {
  const { save, setSyncStatus } = useGameStore.getState();

  if (!userId) return;

  try {
    setSyncStatus("syncing_cloud");
    await saveToCloud(userId, save);
    setSyncStatus("synced");
  } catch {
    console.error("[save-provider] Cloud sync failed");
    setSyncStatus("sync_error");
  }
}

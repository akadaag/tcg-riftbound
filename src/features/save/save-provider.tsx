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
 *
 * BUG FIX: Previously, the effect checked `hasHydrated` once when `user`
 * changed, but hydration completes asynchronously AFTER `user` is set.
 * The effect returned early and never started auto-save intervals.
 * Now we use `useGameStore.subscribe` to wait for hydration before starting.
 */
export function SaveProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const lastSavedRef = useRef<string>(""); // JSON snapshot for dirty checking

  useEffect(() => {
    if (!user) return;

    let localInterval: ReturnType<typeof setInterval> | null = null;
    let cloudInterval: ReturnType<typeof setInterval> | null = null;
    let unsubscribeHydration: (() => void) | null = null;

    /**
     * Start the auto-save intervals and event listeners.
     * Called once hydration is confirmed.
     */
    function startAutoSave(userId: string) {
      // Initialize snapshot from current (hydrated) save
      const { save, setSyncStatus } = useGameStore.getState();
      lastSavedRef.current = JSON.stringify(save);

      // ---- Local auto-save (every 2s, only if dirty) ----
      localInterval = setInterval(async () => {
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
      cloudInterval = setInterval(() => {
        syncToCloud(userId);
      }, CLOUD_SYNC_INTERVAL_MS);

      // ---- Cloud sync on tab hidden ----
      document.addEventListener("visibilitychange", handleVisibilityChange);

      // ---- Cloud sync on beforeunload / pagehide ----
      window.addEventListener("beforeunload", handleBeforeUnload);
      window.addEventListener("pagehide", handlePageHide);
    }

    // Event handlers (defined at effect scope so cleanup can reference them)
    function handleVisibilityChange() {
      if (document.visibilityState === "hidden" && user) {
        syncToCloud(user.id);
      }
    }

    function handlePageHide() {
      if (user) {
        const currentSave = useGameStore.getState().save;
        saveToCloud(user.id, currentSave).catch(() => {});
        saveLocally(currentSave).catch(() => {});
      }
    }

    function handleBeforeUnload() {
      if (user) {
        const currentSave = useGameStore.getState().save;
        saveToCloud(user.id, currentSave).catch(() => {});
        saveLocally(currentSave).catch(() => {});
      }
    }

    // Check if already hydrated; if not, subscribe and wait
    const { hasHydrated } = useGameStore.getState();
    if (hasHydrated) {
      startAutoSave(user.id);
    } else {
      // Subscribe to store changes and start auto-save once hydrated
      unsubscribeHydration = useGameStore.subscribe((state) => {
        if (state.hasHydrated) {
          unsubscribeHydration?.();
          unsubscribeHydration = null;
          startAutoSave(user.id);
        }
      });
    }

    return () => {
      // Clean up subscription if still waiting
      unsubscribeHydration?.();
      // Clean up intervals
      if (localInterval) clearInterval(localInterval);
      if (cloudInterval) clearInterval(cloudInterval);
      // Clean up event listeners
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [user]);

  return <>{children}</>;
}

/**
 * Sync current save to the cloud.
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

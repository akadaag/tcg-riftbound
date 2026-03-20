"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { useGameStore, createInitialSave } from "@/stores/game-store";
import { loadCloudSave, resolveConflict } from "@/features/save/cloud-save";
import { loadLocalSave } from "@/features/save/local-save";
import { calculateOfflineProgress } from "@/features/engine/day-cycle";
import { notifyOfflineReturn } from "@/lib/notifications";
import { initializeHype } from "@/features/engine/hype";
import {
  getAllSets,
  getProductMap,
  getProductSetMap,
  getGameplayMeta,
  getCardById,
} from "@/features/catalog";
import { buildActiveMissions } from "@/features/missions";
import type { User } from "@supabase/supabase-js";

interface AuthContextValue {
  user: User | null;
  displayName: string;
  isReady: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  displayName: "",
  isReady: false,
});

export function useAuth() {
  return useContext(AuthContext);
}

/**
 * AuthProvider — wraps the app to:
 * 1. Check/listen to Supabase auth state
 * 2. Load the save (local-first, then cloud)
 * 3. Hydrate the Zustand game store
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [isReady, setIsReady] = useState(false);

  const {
    loadSave,
    setAuthenticated,
    clearAuth,
    setLoading,
    setHydrated,
    setOfflineReport,
    applySave,
    setSetHype,
    setMissions,
  } = useGameStore();

  useEffect(() => {
    const supabase = createClient();

    async function initAuth() {
      setLoading(true);

      // 1. Get current session
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (!currentUser) {
        setLoading(false);
        setIsReady(true);
        return;
      }

      setUser(currentUser);
      setAuthenticated(currentUser.id);
      setDisplayName(
        currentUser.user_metadata?.display_name || currentUser.email || "",
      );

      // 2. Load saves (local-first for speed, then cloud for authority)
      try {
        const [localSave, cloudSave] = await Promise.all([
          loadLocalSave(),
          loadCloudSave(currentUser.id),
        ]);

        let resolvedSave = resolveConflict(localSave, cloudSave);

        if (resolvedSave) {
          // Ensure userId matches current user
          resolvedSave = { ...resolvedSave, userId: currentUser.id };

          // 3. Initialize set hype if missing (new game or legacy save)
          if (resolvedSave.setHype.length === 0) {
            resolvedSave = {
              ...resolvedSave,
              setHype: initializeHype(getAllSets()),
            };
          }

          // 3b. Initialize singlesListings if missing (legacy save)
          if (!resolvedSave.singlesListings) {
            resolvedSave = {
              ...resolvedSave,
              singlesListings: [],
            };
          }

          // 3c. Initialize new stats fields if missing (legacy save)
          if (resolvedSave.stats.totalSinglesRevenue === undefined) {
            resolvedSave = {
              ...resolvedSave,
              stats: {
                ...resolvedSave.stats,
                totalSinglesRevenue: 0,
                totalSinglesSold: 0,
                totalTradesCompleted: 0,
              },
            };
          }

          // 3d. Initialize new DayReport fields if missing (legacy save)
          if (resolvedSave.todayReport.singlesRevenue === undefined) {
            resolvedSave = {
              ...resolvedSave,
              todayReport: {
                ...resolvedSave.todayReport,
                singlesRevenue: 0,
                singlesSold: 0,
              },
            };
          }

          // 3e. Initialize M13 real-time simulation fields if missing (legacy save)
          if (resolvedSave.lastTickAt === undefined) {
            resolvedSave = {
              ...resolvedSave,
              lastTickAt: null,
              currentPhase: "morning",
              dayElapsedMs: 0,
            };
          }

          // 4. Calculate offline progress
          const productMap = getProductMap();
          const productSetMap = getProductSetMap();
          const offlineResult = calculateOfflineProgress(
            resolvedSave,
            productMap,
            productSetMap,
            getGameplayMeta,
            getGameplayMeta,
            getCardById,
          );

          if (offlineResult) {
            // Apply offline progress to save and show report
            loadSave(offlineResult.updatedSave);
            setOfflineReport(offlineResult.report);

            // Fire notification if player has enabled them
            if (offlineResult.report.revenue > 0) {
              notifyOfflineReturn(
                offlineResult.updatedSave.notificationPreference ?? false,
                offlineResult.report.revenue,
                offlineResult.report.hoursElapsed,
              );
            }

            // 5. Initialize missions if empty
            if (offlineResult.updatedSave.missions.length === 0) {
              const { progress } = buildActiveMissions(
                offlineResult.updatedSave.shopLevel,
                offlineResult.updatedSave.currentDay,
                [],
              );
              setMissions(progress);
            }
          } else {
            loadSave(resolvedSave);

            // 5. Initialize missions if empty
            if (resolvedSave.missions.length === 0) {
              const { progress } = buildActiveMissions(
                resolvedSave.shopLevel,
                resolvedSave.currentDay,
                [],
              );
              setMissions(progress);
            }
          }
        }
      } catch (error) {
        console.error("[auth-provider] Save load error:", error);
        // Continue with default save — don't block the app
      }

      setLoading(false);
      setHydrated(true);
      setIsReady(true);
    }

    initAuth();

    // Listen for auth state changes (login/logout in another tab, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") {
        setUser(null);
        setDisplayName("");
        clearAuth();
      } else if (event === "SIGNED_IN" && session?.user) {
        setUser(session.user);
        setAuthenticated(session.user.id);
        setDisplayName(
          session.user.user_metadata?.display_name || session.user.email || "",
        );
      }
    });

    return () => {
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider value={{ user, displayName, isReady }}>
      {children}
    </AuthContext.Provider>
  );
}

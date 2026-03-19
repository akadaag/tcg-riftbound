"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { useGameStore } from "@/stores/game-store";
import { loadCloudSave, resolveConflict } from "@/features/save/cloud-save";
import { loadLocalSave } from "@/features/save/local-save";
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

  const { loadSave, setAuthenticated, clearAuth, setLoading, setHydrated } =
    useGameStore();

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

        const resolvedSave = resolveConflict(localSave, cloudSave);

        if (resolvedSave) {
          // Ensure userId matches current user
          loadSave({ ...resolvedSave, userId: currentUser.id });
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

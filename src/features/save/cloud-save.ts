import { createClient } from "@/lib/supabase/client";
import type { SaveGame } from "@/types/game";

/**
 * Cloud Save Service
 * Handles loading and saving game data to Supabase.
 * All operations use the browser Supabase client (RLS enforced).
 */

interface CloudSaveRow {
  id: string;
  user_id: string;
  save_version: number;
  game_data: SaveGame;
  updated_at: string;
  created_at: string;
}

/**
 * Load the cloud save for the current authenticated user.
 * Returns null if no save exists yet.
 */
export async function loadCloudSave(userId: string): Promise<SaveGame | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("savegames")
    .select("*")
    .eq("user_id", userId)
    .single<CloudSaveRow>();

  if (error) {
    // PGRST116 = no rows found — not an error, just no save yet
    if (error.code === "PGRST116") {
      return null;
    }
    console.error("[cloud-save] Failed to load:", error.message);
    throw new Error(`Failed to load cloud save: ${error.message}`);
  }

  return data.game_data;
}

/**
 * Save game data to the cloud.
 * Uses upsert (insert or update) keyed on user_id.
 */
export async function saveToCloud(
  userId: string,
  save: SaveGame,
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.from("savegames").upsert(
    {
      user_id: userId,
      save_version: save.saveVersion,
      game_data: save,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "user_id",
    },
  );

  if (error) {
    console.error("[cloud-save] Failed to save:", error.message);
    throw new Error(`Failed to save to cloud: ${error.message}`);
  }
}

/**
 * Compare local and cloud saves, return the most recent one.
 * Implements last_write_wins strategy using save_version + updated_at.
 */
export function resolveConflict(
  local: SaveGame | null,
  cloud: SaveGame | null,
): SaveGame | null {
  if (!local && !cloud) return null;
  if (!local) return cloud;
  if (!cloud) return local;

  // Higher save_version wins
  if (local.saveVersion !== cloud.saveVersion) {
    return local.saveVersion > cloud.saveVersion ? local : cloud;
  }

  // Same version — most recent updated_at wins
  const localTime = new Date(local.updatedAt).getTime();
  const cloudTime = new Date(cloud.updatedAt).getTime();

  return localTime >= cloudTime ? local : cloud;
}

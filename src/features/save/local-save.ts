import type { SaveGame } from "@/types/game";

/**
 * Local Save Service — IndexedDB
 * Provides fast local persistence for offline/quick reads.
 * Uses a single IndexedDB database with one object store.
 */

const DB_NAME = "riftbound-shop";
const DB_VERSION = 1;
const STORE_NAME = "saves";
const SAVE_KEY = "current";

/**
 * Open (or create) the IndexedDB database.
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Load the local save from IndexedDB.
 * Returns null if no save exists.
 */
export async function loadLocalSave(): Promise<SaveGame | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(SAVE_KEY);

      request.onsuccess = () => {
        resolve(request.result ?? null);
      };
      request.onerror = () => reject(request.error);
      tx.oncomplete = () => db.close();
    });
  } catch (error) {
    console.error("[local-save] Failed to load:", error);
    return null;
  }
}

/**
 * Save game data to IndexedDB.
 */
export async function saveLocally(save: SaveGame): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.put(save, SAVE_KEY);

      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  } catch (error) {
    console.error("[local-save] Failed to save:", error);
    throw error;
  }
}

/**
 * Clear the local save from IndexedDB.
 * Called on logout to avoid stale data.
 */
export async function clearLocalSave(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.delete(SAVE_KEY);

      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  } catch (error) {
    console.error("[local-save] Failed to clear:", error);
  }
}

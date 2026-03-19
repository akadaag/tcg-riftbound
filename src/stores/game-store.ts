import { create } from "zustand";
import type {
  SaveGame,
  SyncStatus,
  InventoryItem,
  CollectionEntry,
  UpgradeState,
  MissionProgress,
  ShopStats,
} from "@/types/game";

// ============================================
// Game Store — Zustand
// ============================================

/**
 * The initial blank save state for a new player.
 * This serves as the default state before any save is loaded.
 */
function createInitialSave(): SaveGame {
  return {
    userId: "",
    saveVersion: 1,
    updatedAt: new Date().toISOString(),
    shopLevel: 1,
    softCurrency: 500, // Starting currency
    reputation: 0,
    currentDay: 1,
    inventory: [],
    collection: [],
    upgrades: [],
    missions: [],
    stats: {
      totalSales: 0,
      totalRevenue: 0,
      totalPacksOpened: 0,
      totalCardsCollected: 0,
      totalCustomersServed: 0,
      uniqueCardsOwned: 0,
    },
  };
}

interface GameState {
  // Auth
  isAuthenticated: boolean;
  userId: string | null;

  // Save data
  save: SaveGame;

  // Sync
  syncStatus: SyncStatus;

  // UI state
  isLoading: boolean;
  hasHydrated: boolean;

  // Actions — Auth
  setAuthenticated: (userId: string) => void;
  clearAuth: () => void;

  // Actions — Save
  loadSave: (save: SaveGame) => void;
  resetSave: () => void;
  updateCurrency: (amount: number) => void;
  updateReputation: (amount: number) => void;
  incrementDay: () => void;

  // Actions — Inventory
  addInventoryItem: (item: InventoryItem) => void;
  updateInventoryItem: (
    productId: string,
    changes: Partial<InventoryItem>,
  ) => void;

  // Actions — Collection
  addCollectionEntry: (entry: CollectionEntry) => void;
  updateCollectionEntry: (
    cardId: string,
    changes: Partial<CollectionEntry>,
  ) => void;

  // Actions — Upgrades
  setUpgradeState: (upgrade: UpgradeState) => void;

  // Actions — Missions
  updateMissionProgress: (
    missionId: string,
    changes: Partial<MissionProgress>,
  ) => void;

  // Actions — Stats
  updateStats: (changes: Partial<ShopStats>) => void;

  // Actions — Sync
  setSyncStatus: (status: SyncStatus) => void;

  // Actions — UI
  setLoading: (loading: boolean) => void;
  setHydrated: (hydrated: boolean) => void;
}

export const useGameStore = create<GameState>()((set, get) => ({
  // Initial state
  isAuthenticated: false,
  userId: null,
  save: createInitialSave(),
  syncStatus: "offline",
  isLoading: true,
  hasHydrated: false,

  // Auth
  setAuthenticated: (userId: string) =>
    set({
      isAuthenticated: true,
      userId,
      save: { ...get().save, userId },
    }),

  clearAuth: () =>
    set({
      isAuthenticated: false,
      userId: null,
      save: createInitialSave(),
      syncStatus: "offline",
    }),

  // Save
  loadSave: (save: SaveGame) => set({ save, isLoading: false }),

  resetSave: () => set({ save: createInitialSave() }),

  updateCurrency: (amount: number) =>
    set((state) => ({
      save: {
        ...state.save,
        softCurrency: Math.max(0, state.save.softCurrency + amount),
        updatedAt: new Date().toISOString(),
      },
    })),

  updateReputation: (amount: number) =>
    set((state) => ({
      save: {
        ...state.save,
        reputation: Math.max(0, state.save.reputation + amount),
        updatedAt: new Date().toISOString(),
      },
    })),

  incrementDay: () =>
    set((state) => ({
      save: {
        ...state.save,
        currentDay: state.save.currentDay + 1,
        updatedAt: new Date().toISOString(),
      },
    })),

  // Inventory
  addInventoryItem: (item: InventoryItem) =>
    set((state) => {
      const existing = state.save.inventory.find(
        (i) => i.productId === item.productId,
      );
      if (existing) {
        return {
          save: {
            ...state.save,
            inventory: state.save.inventory.map((i) =>
              i.productId === item.productId
                ? {
                    ...i,
                    ownedQuantity: i.ownedQuantity + item.ownedQuantity,
                  }
                : i,
            ),
            updatedAt: new Date().toISOString(),
          },
        };
      }
      return {
        save: {
          ...state.save,
          inventory: [...state.save.inventory, item],
          updatedAt: new Date().toISOString(),
        },
      };
    }),

  updateInventoryItem: (productId: string, changes: Partial<InventoryItem>) =>
    set((state) => ({
      save: {
        ...state.save,
        inventory: state.save.inventory.map((i) =>
          i.productId === productId ? { ...i, ...changes } : i,
        ),
        updatedAt: new Date().toISOString(),
      },
    })),

  // Collection
  addCollectionEntry: (entry: CollectionEntry) =>
    set((state) => {
      const existing = state.save.collection.find(
        (c) => c.cardId === entry.cardId,
      );
      if (existing) {
        return {
          save: {
            ...state.save,
            collection: state.save.collection.map((c) =>
              c.cardId === entry.cardId
                ? { ...c, copiesOwned: c.copiesOwned + entry.copiesOwned }
                : c,
            ),
            updatedAt: new Date().toISOString(),
          },
        };
      }
      return {
        save: {
          ...state.save,
          collection: [...state.save.collection, entry],
          updatedAt: new Date().toISOString(),
        },
      };
    }),

  updateCollectionEntry: (cardId: string, changes: Partial<CollectionEntry>) =>
    set((state) => ({
      save: {
        ...state.save,
        collection: state.save.collection.map((c) =>
          c.cardId === cardId ? { ...c, ...changes } : c,
        ),
        updatedAt: new Date().toISOString(),
      },
    })),

  // Upgrades
  setUpgradeState: (upgrade: UpgradeState) =>
    set((state) => {
      const existing = state.save.upgrades.find(
        (u) => u.upgradeId === upgrade.upgradeId,
      );
      if (existing) {
        return {
          save: {
            ...state.save,
            upgrades: state.save.upgrades.map((u) =>
              u.upgradeId === upgrade.upgradeId ? upgrade : u,
            ),
            updatedAt: new Date().toISOString(),
          },
        };
      }
      return {
        save: {
          ...state.save,
          upgrades: [...state.save.upgrades, upgrade],
          updatedAt: new Date().toISOString(),
        },
      };
    }),

  // Missions
  updateMissionProgress: (
    missionId: string,
    changes: Partial<MissionProgress>,
  ) =>
    set((state) => ({
      save: {
        ...state.save,
        missions: state.save.missions.map((m) =>
          m.missionId === missionId ? { ...m, ...changes } : m,
        ),
        updatedAt: new Date().toISOString(),
      },
    })),

  // Stats
  updateStats: (changes: Partial<ShopStats>) =>
    set((state) => ({
      save: {
        ...state.save,
        stats: { ...state.save.stats, ...changes },
        updatedAt: new Date().toISOString(),
      },
    })),

  // Sync
  setSyncStatus: (status: SyncStatus) => set({ syncStatus: status }),

  // UI
  setLoading: (loading: boolean) => set({ isLoading: loading }),

  setHydrated: (hydrated: boolean) => set({ hasHydrated: hydrated }),
}));

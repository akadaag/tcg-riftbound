import { create } from "zustand";
import type {
  SaveGame,
  SyncStatus,
  InventoryItem,
  CollectionEntry,
  UpgradeState,
  MissionProgress,
  ShopStats,
  ShelfSlot,
  DayReport,
  GameEvent,
  OfflineReport,
  SetHype,
  ProductDefinition,
} from "@/types/game";
import { XP_THRESHOLDS, STARTING_SHELVES } from "@/types/game";

// ============================================
// Game Store — Zustand
// ============================================

/**
 * The initial blank save state for a new player.
 * This serves as the default state before any save is loaded.
 */
function createEmptyDayReport(day: number): DayReport {
  return {
    day,
    revenue: 0,
    costOfGoodsSold: 0,
    profit: 0,
    customersVisited: 0,
    customersPurchased: 0,
    productsSold: {},
    packsOpened: 0,
    newCardsDiscovered: 0,
    xpEarned: 0,
    activeEvents: [],
  };
}

function createInitialShelves(): ShelfSlot[] {
  return Array.from({ length: STARTING_SHELVES }, () => ({
    productId: null,
    quantity: 0,
    markup: 20, // Default 20% markup
  }));
}

export function createInitialSave(): SaveGame {
  const now = new Date().toISOString();
  return {
    userId: "",
    saveVersion: 1,
    updatedAt: now,

    // Shop
    shopLevel: 1,
    softCurrency: 500,
    reputation: 0,
    currentDay: 1,
    xp: 0,
    xpToNextLevel: XP_THRESHOLDS[2],
    lastPlayedAt: now,

    // Shelves
    shelves: createInitialShelves(),

    // Inventory & Collection
    inventory: [],
    collection: [],
    displayCase: [],

    // Hype
    setHype: [],

    // Events
    activeEvents: [],
    pastEventIds: [],

    // Progression
    upgrades: [],
    missions: [],
    unlockedProducts: [],

    // Today tracking
    todayReport: createEmptyDayReport(1),

    // Lifetime stats
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

// ============================================
// Store Interface
// ============================================

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

  // Transient UI state (not persisted)
  offlineReport: OfflineReport | null;

  // Actions — Auth
  setAuthenticated: (userId: string) => void;
  clearAuth: () => void;

  // Actions — Save (core)
  loadSave: (save: SaveGame) => void;
  resetSave: () => void;
  patchSave: (patch: Partial<SaveGame>) => void;
  applySave: (save: SaveGame) => void;

  // Actions — Currency & Reputation
  updateCurrency: (amount: number) => void;
  updateReputation: (amount: number) => void;

  // Actions — Shelves
  setShelfProduct: (
    shelfIndex: number,
    productId: string | null,
    quantity: number,
  ) => void;
  setShelfMarkup: (shelfIndex: number, markup: number) => void;
  restockShelf: (shelfIndex: number, quantity: number) => void;
  removeShelfStock: (shelfIndex: number, quantity: number) => void;
  addShelfSlot: () => void;

  // Actions — Inventory (buy from supplier)
  buyFromSupplier: (
    productId: string,
    quantity: number,
    totalCost: number,
    packsProductId?: string,
  ) => void;
  addInventoryItem: (item: InventoryItem) => void;
  removeInventory: (productId: string, quantity: number) => void;

  // Actions — Collection
  addCollectionEntry: (entry: CollectionEntry) => void;
  addCardsToCollection: (cardIds: string[]) => {
    newUniqueCount: number;
    duplicateCount: number;
  };

  // Actions — Day tracking
  recordSale: (
    productId: string,
    quantity: number,
    revenue: number,
    costOfGoods: number,
  ) => void;
  recordPackOpened: (newCardsDiscovered: number) => void;
  recordCustomerVisit: (purchased: boolean) => void;

  // Actions — Events & Hype
  setActiveEvents: (events: GameEvent[]) => void;
  setSetHype: (hype: SetHype[]) => void;

  // Actions — Display Case
  addToDisplayCase: (cardId: string) => void;
  removeFromDisplayCase: (cardId: string) => void;

  // Actions — Unlocks
  unlockProduct: (productId: string) => void;

  // Actions — Upgrades & Missions
  setUpgradeState: (upgrade: UpgradeState) => void;
  updateMissionProgress: (
    missionId: string,
    changes: Partial<MissionProgress>,
  ) => void;

  // Actions — Stats
  updateStats: (changes: Partial<ShopStats>) => void;

  // Actions — Offline
  setOfflineReport: (report: OfflineReport | null) => void;

  // Actions — Sync
  setSyncStatus: (status: SyncStatus) => void;

  // Actions — UI
  setLoading: (loading: boolean) => void;
  setHydrated: (hydrated: boolean) => void;
}

// ============================================
// Store Implementation
// ============================================

export const useGameStore = create<GameState>()((set, get) => ({
  // Initial state
  isAuthenticated: false,
  userId: null,
  save: createInitialSave(),
  syncStatus: "offline",
  isLoading: true,
  hasHydrated: false,
  offlineReport: null,

  // ── Auth ─────────────────────────────────────────

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
      offlineReport: null,
    }),

  // ── Save (core) ──────────────────────────────────

  loadSave: (save: SaveGame) => set({ save, isLoading: false }),

  resetSave: () => set({ save: createInitialSave(), offlineReport: null }),

  /** Shallow-merge a partial update into save. */
  patchSave: (patch: Partial<SaveGame>) =>
    set((state) => ({
      save: {
        ...state.save,
        ...patch,
        updatedAt: new Date().toISOString(),
      },
    })),

  /** Replace entire save (e.g. after day advance or offline calc). */
  applySave: (save: SaveGame) => set({ save }),

  // ── Currency & Reputation ────────────────────────

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

  // ── Shelves ──────────────────────────────────────

  setShelfProduct: (
    shelfIndex: number,
    productId: string | null,
    quantity: number,
  ) =>
    set((state) => {
      const shelves = [...state.save.shelves];
      if (shelfIndex < 0 || shelfIndex >= shelves.length) return state;
      shelves[shelfIndex] = {
        ...shelves[shelfIndex],
        productId,
        quantity,
      };
      return {
        save: { ...state.save, shelves, updatedAt: new Date().toISOString() },
      };
    }),

  setShelfMarkup: (shelfIndex: number, markup: number) =>
    set((state) => {
      const shelves = [...state.save.shelves];
      if (shelfIndex < 0 || shelfIndex >= shelves.length) return state;
      shelves[shelfIndex] = {
        ...shelves[shelfIndex],
        markup: Math.max(0, Math.min(100, markup)),
      };
      return {
        save: { ...state.save, shelves, updatedAt: new Date().toISOString() },
      };
    }),

  restockShelf: (shelfIndex: number, quantity: number) =>
    set((state) => {
      const shelves = [...state.save.shelves];
      if (shelfIndex < 0 || shelfIndex >= shelves.length) return state;
      const shelf = shelves[shelfIndex];
      if (!shelf.productId) return state;

      // Remove from inventory
      const inventory = state.save.inventory.map((item) =>
        item.productId === shelf.productId
          ? {
              ...item,
              ownedQuantity: Math.max(0, item.ownedQuantity - quantity),
            }
          : item,
      );

      shelves[shelfIndex] = {
        ...shelf,
        quantity: shelf.quantity + quantity,
      };

      return {
        save: {
          ...state.save,
          shelves,
          inventory,
          updatedAt: new Date().toISOString(),
        },
      };
    }),

  removeShelfStock: (shelfIndex: number, quantity: number) =>
    set((state) => {
      const shelves = [...state.save.shelves];
      if (shelfIndex < 0 || shelfIndex >= shelves.length) return state;
      const shelf = shelves[shelfIndex];
      const newQty = Math.max(0, shelf.quantity - quantity);
      shelves[shelfIndex] = {
        ...shelf,
        quantity: newQty,
        // Clear product if quantity hits 0
        ...(newQty === 0 ? { productId: null } : {}),
      };
      return {
        save: { ...state.save, shelves, updatedAt: new Date().toISOString() },
      };
    }),

  addShelfSlot: () =>
    set((state) => ({
      save: {
        ...state.save,
        shelves: [
          ...state.save.shelves,
          { productId: null, quantity: 0, markup: 20 },
        ],
        updatedAt: new Date().toISOString(),
      },
    })),

  // ── Inventory ────────────────────────────────────

  /**
   * Buy a product from the supplier.
   * Deducts cost, adds to inventory. For boxes, converts to packs.
   */
  buyFromSupplier: (
    productId: string,
    quantity: number,
    totalCost: number,
    packsProductId?: string,
  ) =>
    set((state) => {
      if (state.save.softCurrency < totalCost) return state;

      let inventory = [...state.save.inventory];

      if (packsProductId) {
        // Box purchase: convert to packs (24 packs per box)
        const packQty = quantity * 24;
        const existingPack = inventory.find(
          (i) => i.productId === packsProductId,
        );
        if (existingPack) {
          inventory = inventory.map((i) =>
            i.productId === packsProductId
              ? { ...i, ownedQuantity: i.ownedQuantity + packQty }
              : i,
          );
        } else {
          inventory.push({
            productId: packsProductId,
            ownedQuantity: packQty,
          });
        }
      } else {
        // Regular purchase
        const existing = inventory.find((i) => i.productId === productId);
        if (existing) {
          inventory = inventory.map((i) =>
            i.productId === productId
              ? { ...i, ownedQuantity: i.ownedQuantity + quantity }
              : i,
          );
        } else {
          inventory.push({ productId, ownedQuantity: quantity });
        }
      }

      return {
        save: {
          ...state.save,
          softCurrency: state.save.softCurrency - totalCost,
          inventory,
          todayReport: {
            ...state.save.todayReport,
            costOfGoodsSold: state.save.todayReport.costOfGoodsSold + totalCost,
          },
          updatedAt: new Date().toISOString(),
        },
      };
    }),

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
                ? { ...i, ownedQuantity: i.ownedQuantity + item.ownedQuantity }
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

  removeInventory: (productId: string, quantity: number) =>
    set((state) => ({
      save: {
        ...state.save,
        inventory: state.save.inventory
          .map((i) =>
            i.productId === productId
              ? { ...i, ownedQuantity: Math.max(0, i.ownedQuantity - quantity) }
              : i,
          )
          .filter((i) => i.ownedQuantity > 0),
        updatedAt: new Date().toISOString(),
      },
    })),

  // ── Collection ───────────────────────────────────

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
                ? {
                    ...c,
                    copiesOwned: c.copiesOwned + entry.copiesOwned,
                    isNew: false,
                  }
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

  /**
   * Batch add pulled cards to the collection.
   * Returns count of new unique cards vs duplicates.
   */
  addCardsToCollection: (cardIds: string[]) => {
    const state = get();
    const ownedSet = new Set(state.save.collection.map((c) => c.cardId));
    let newUniqueCount = 0;
    let duplicateCount = 0;
    const now = new Date().toISOString();

    let collection = [...state.save.collection];

    for (const cardId of cardIds) {
      if (ownedSet.has(cardId)) {
        // Duplicate — increment count
        duplicateCount++;
        collection = collection.map((c) =>
          c.cardId === cardId ? { ...c, copiesOwned: c.copiesOwned + 1 } : c,
        );
      } else {
        // New card
        newUniqueCount++;
        ownedSet.add(cardId);
        collection.push({
          cardId,
          copiesOwned: 1,
          firstObtainedAt: now,
          highestVariantOwned: null,
          isNew: true,
        });
      }
    }

    set({
      save: {
        ...state.save,
        collection,
        stats: {
          ...state.save.stats,
          totalCardsCollected:
            state.save.stats.totalCardsCollected + cardIds.length,
          uniqueCardsOwned: state.save.stats.uniqueCardsOwned + newUniqueCount,
        },
        updatedAt: now,
      },
    });

    return { newUniqueCount, duplicateCount };
  },

  // ── Day tracking ─────────────────────────────────

  recordSale: (
    productId: string,
    quantity: number,
    revenue: number,
    costOfGoods: number,
  ) =>
    set((state) => ({
      save: {
        ...state.save,
        softCurrency: state.save.softCurrency + revenue,
        todayReport: {
          ...state.save.todayReport,
          revenue: state.save.todayReport.revenue + revenue,
          costOfGoodsSold: state.save.todayReport.costOfGoodsSold + costOfGoods,
          productsSold: {
            ...state.save.todayReport.productsSold,
            [productId]:
              (state.save.todayReport.productsSold[productId] ?? 0) + quantity,
          },
        },
        stats: {
          ...state.save.stats,
          totalSales: state.save.stats.totalSales + quantity,
          totalRevenue: state.save.stats.totalRevenue + revenue,
        },
        updatedAt: new Date().toISOString(),
      },
    })),

  recordPackOpened: (newCardsDiscovered: number) =>
    set((state) => ({
      save: {
        ...state.save,
        todayReport: {
          ...state.save.todayReport,
          packsOpened: state.save.todayReport.packsOpened + 1,
          newCardsDiscovered:
            state.save.todayReport.newCardsDiscovered + newCardsDiscovered,
        },
        stats: {
          ...state.save.stats,
          totalPacksOpened: state.save.stats.totalPacksOpened + 1,
        },
        updatedAt: new Date().toISOString(),
      },
    })),

  recordCustomerVisit: (purchased: boolean) =>
    set((state) => ({
      save: {
        ...state.save,
        todayReport: {
          ...state.save.todayReport,
          customersVisited: state.save.todayReport.customersVisited + 1,
          customersPurchased:
            state.save.todayReport.customersPurchased + (purchased ? 1 : 0),
        },
        stats: {
          ...state.save.stats,
          totalCustomersServed: state.save.stats.totalCustomersServed + 1,
        },
        updatedAt: new Date().toISOString(),
      },
    })),

  // ── Events & Hype ────────────────────────────────

  setActiveEvents: (events: GameEvent[]) =>
    set((state) => ({
      save: {
        ...state.save,
        activeEvents: events,
        updatedAt: new Date().toISOString(),
      },
    })),

  setSetHype: (hype: SetHype[]) =>
    set((state) => ({
      save: {
        ...state.save,
        setHype: hype,
        updatedAt: new Date().toISOString(),
      },
    })),

  // ── Display Case ─────────────────────────────────

  addToDisplayCase: (cardId: string) =>
    set((state) => {
      if (state.save.displayCase.includes(cardId)) return state;
      return {
        save: {
          ...state.save,
          displayCase: [...state.save.displayCase, cardId],
          updatedAt: new Date().toISOString(),
        },
      };
    }),

  removeFromDisplayCase: (cardId: string) =>
    set((state) => ({
      save: {
        ...state.save,
        displayCase: state.save.displayCase.filter((id) => id !== cardId),
        updatedAt: new Date().toISOString(),
      },
    })),

  // ── Unlocks ──────────────────────────────────────

  unlockProduct: (productId: string) =>
    set((state) => {
      if (state.save.unlockedProducts.includes(productId)) return state;
      return {
        save: {
          ...state.save,
          unlockedProducts: [...state.save.unlockedProducts, productId],
          updatedAt: new Date().toISOString(),
        },
      };
    }),

  // ── Upgrades ─────────────────────────────────────

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

  // ── Missions ─────────────────────────────────────

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

  // ── Stats ────────────────────────────────────────

  updateStats: (changes: Partial<ShopStats>) =>
    set((state) => ({
      save: {
        ...state.save,
        stats: { ...state.save.stats, ...changes },
        updatedAt: new Date().toISOString(),
      },
    })),

  // ── Offline ──────────────────────────────────────

  setOfflineReport: (report: OfflineReport | null) =>
    set({ offlineReport: report }),

  // ── Sync ─────────────────────────────────────────

  setSyncStatus: (status: SyncStatus) => set({ syncStatus: status }),

  // ── UI ───────────────────────────────────────────

  setLoading: (loading: boolean) => set({ isLoading: loading }),

  setHydrated: (hydrated: boolean) => set({ hasHydrated: hydrated }),
}));

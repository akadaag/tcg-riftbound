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
  MissionDefinition,
  SinglesListing,
  Rarity,
  DayPhase,
  ShopNotification,
  ShopArea,
  ShopAreaType,
  StaffMember,
  StaffCandidate,
  PlayerEventType,
} from "@/types/game";
import { XP_THRESHOLDS, STARTING_SHELVES } from "@/types/game";
import type { EndDayResult } from "@/features/engine/day-cycle";
import {
  getUpgradeById,
  getUpgradeCost,
  canPurchaseUpgrade,
  getOwnedLevel,
  getDisplayCaseCapacity,
  getTotalInventoryCapacity,
} from "@/features/upgrades";
import { applyXP } from "@/features/engine/economy";
import {
  createInitialShopAreas,
  getAreaDefinition,
  canBuildArea,
  canUpgradeArea,
  getAreaEffects,
} from "@/features/engine/areas";
import {
  hireStaff as engineHireStaff,
  fireStaff as engineFireStaff,
  giveRaise as engineGiveRaise,
  generateCandidates,
} from "@/features/engine/staff";
import {
  createPlannedEvent,
  cancelPlannedEvent as engineCancelPlannedEvent,
  checkEventRequirements,
} from "@/features/engine/event-planner";

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
    singlesRevenue: 0,
    singlesSold: 0,
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
    softCurrency: 750, // Bumped from 500 G → 750 G for healthier early-game economy
    reputation: 0,
    currentDay: 1,
    xp: 0,
    xpToNextLevel: XP_THRESHOLDS[2],
    lastPlayedAt: now,

    // Real-time simulation (M13)
    lastTickAt: null,
    currentPhase: "morning" as DayPhase,
    dayElapsedMs: 0,

    // Shelves
    shelves: createInitialShelves(),

    // Inventory & Collection
    inventory: [],
    collection: [],
    displayCase: [],
    singlesListings: [],

    // Hype
    setHype: [],

    // Events
    activeEvents: [],
    pastEventIds: [],

    // Progression
    upgrades: [],
    missions: [],
    unlockedProducts: [],
    completedSets: [],

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
      totalSinglesRevenue: 0,
      totalSinglesSold: 0,
      totalTradesCompleted: 0,
      totalDaysPlayed: 0,
      bestDayRevenue: 0,
      bestDayProfit: 0,
    },

    // Preferences
    notificationPreference: false,

    // Shop Areas (M14)
    shopAreas: createInitialShopAreas(),

    // Staff (M15)
    staff: [],
    staffCandidates: [],
    staffCandidatesRefreshedDay: 0,

    // Player Events (M17)
    plannedEvents: [],
    totalPlayerEventsHosted: 0,
    playerEventCooldowns: {},
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
  /** Live notification feed — capped at 50 entries. Not persisted. */
  notifications: ShopNotification[];
  /** End-of-day result shown in the night summary modal. */
  endDayResult: EndDayResult | null;

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

  // Actions — Singles Counter
  listSingle: (cardId: string, askingPrice: number) => boolean;
  unlistSingle: (cardId: string) => void;
  sellSingle: (cardId: string, revenue: number) => void;

  // Actions — Card Trader
  tradeCards: (selectedCardIds: string[], resultCardId: string) => void;

  // Actions — Unlocks
  unlockProduct: (productId: string) => void;

  // Actions — Upgrades & Missions
  setUpgradeState: (upgrade: UpgradeState) => void;
  purchaseUpgrade: (upgradeId: string) => {
    success: boolean;
    reason: string | null;
  };
  updateMissionProgress: (
    missionId: string,
    changes: Partial<MissionProgress>,
  ) => void;
  setMissions: (missions: MissionProgress[]) => void;
  claimMissionReward: (
    missionId: string,
    mission: MissionDefinition,
  ) => boolean;

  // Actions — Tick dispatch (called by useSimulation hook each tick)
  applyTickResult: (patch: {
    dayElapsedMs: number;
    lastTickAt: string;
    currentPhase: DayPhase;
    /** Revenue from a sale this tick (0 if no sale). */
    revenue: number;
    costOfGoods: number;
    productId: string | null;
    quantity: number;
    customerVisited: boolean;
    customerPurchased: boolean;
    updatedShelves: ShelfSlot[] | null;
    notification: ShopNotification | null;
  }) => void;
  /** Advance to the next day (called when night→morning transition fires). */
  applyDayTransition: (result: EndDayResult) => void;
  /** Clear the end-of-day result (dismiss the modal). */
  clearEndDayResult: () => void;

  // Actions — Notifications
  addNotification: (n: ShopNotification) => void;
  clearNotifications: () => void;

  // Actions — Stats
  updateStats: (changes: Partial<ShopStats>) => void;

  // Actions — Offline
  setOfflineReport: (report: OfflineReport | null) => void;

  // Actions — Sync
  setSyncStatus: (status: SyncStatus) => void;

  // Actions — Preferences
  setNotificationPreference: (enabled: boolean) => void;

  // Actions — Shop Areas (M14)
  buildArea: (areaId: ShopAreaType) => {
    success: boolean;
    reason: string | null;
  };
  upgradeArea: (areaId: ShopAreaType) => {
    success: boolean;
    reason: string | null;
  };

  // Actions — Staff (M15)
  hireStaffMember: (candidateId: string) => {
    success: boolean;
    reason: string | null;
  };
  fireStaffMember: (staffId: string) => void;
  giveStaffRaise: (
    staffId: string,
    raiseAmount: number,
  ) => {
    success: boolean;
    reason: string | null;
  };
  refreshStaffCandidates: () => void;

  // Actions — Player Events (M17)
  planEvent: (type: PlayerEventType) => {
    success: boolean;
    reason: string | null;
  };
  cancelPlannedEvent: (eventId: string) => void;

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
  notifications: [],
  endDayResult: null,

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

      // Enforce inventory capacity (upgrades + area bonus)
      const areaFx = getAreaEffects(state.save.shopAreas);
      const capacity =
        getTotalInventoryCapacity(state.save.upgrades) +
        areaFx.inventoryCapacityBonus;
      const currentTotal = state.save.inventory.reduce(
        (acc, i) => acc + i.ownedQuantity,
        0,
      );
      const wouldAdd = packsProductId ? quantity * 24 : quantity;
      if (currentTotal + wouldAdd > capacity) return state;

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

  // ── Singles Counter ──────────────────────────────

  /**
   * List a card for sale on the singles counter.
   * Requires copiesOwned >= 2 (keep at least 1). Returns false if invalid.
   */
  listSingle: (cardId: string, askingPrice: number) => {
    const state = get();
    const entry = state.save.collection.find((c) => c.cardId === cardId);
    if (!entry || entry.copiesOwned < 2) return false;

    // Already listed?
    if (state.save.singlesListings.some((l) => l.cardId === cardId))
      return false;

    // Slot limit: 5 base + area bonuses
    const areaEffects = getAreaEffects(state.save.shopAreas);
    const MAX_SINGLES_SLOTS = 5 + areaEffects.extraSinglesSlots;
    if (state.save.singlesListings.length >= MAX_SINGLES_SLOTS) return false;

    set({
      save: {
        ...state.save,
        singlesListings: [
          ...state.save.singlesListings,
          {
            cardId,
            askingPrice: Math.max(1, Math.round(askingPrice)),
            listedAt: new Date().toISOString(),
          },
        ],
        updatedAt: new Date().toISOString(),
      },
    });
    return true;
  },

  /** Remove a card listing from the singles counter. */
  unlistSingle: (cardId: string) =>
    set((state) => ({
      save: {
        ...state.save,
        singlesListings: state.save.singlesListings.filter(
          (l) => l.cardId !== cardId,
        ),
        updatedAt: new Date().toISOString(),
      },
    })),

  /**
   * Sell a single card. Removes the listing, decrements copiesOwned,
   * adds revenue, updates stats and todayReport.
   */
  sellSingle: (cardId: string, revenue: number) =>
    set((state) => {
      const listing = state.save.singlesListings.find(
        (l) => l.cardId === cardId,
      );
      if (!listing) return state;

      return {
        save: {
          ...state.save,
          softCurrency: state.save.softCurrency + revenue,
          singlesListings: state.save.singlesListings.filter(
            (l) => l.cardId !== cardId,
          ),
          collection: state.save.collection.map((c) =>
            c.cardId === cardId
              ? { ...c, copiesOwned: Math.max(0, c.copiesOwned - 1) }
              : c,
          ),
          todayReport: {
            ...state.save.todayReport,
            singlesRevenue: state.save.todayReport.singlesRevenue + revenue,
            singlesSold: state.save.todayReport.singlesSold + 1,
            revenue: state.save.todayReport.revenue + revenue,
          },
          stats: {
            ...state.save.stats,
            totalSinglesRevenue: state.save.stats.totalSinglesRevenue + revenue,
            totalSinglesSold: state.save.stats.totalSinglesSold + 1,
            totalRevenue: state.save.stats.totalRevenue + revenue,
          },
          updatedAt: new Date().toISOString(),
        },
      };
    }),

  // ── Card Trader ──────────────────────────────────

  /**
   * Execute a trade: sacrifice 5 cards (decrement copiesOwned by 1 each),
   * add 1 copy of the result card.
   */
  tradeCards: (selectedCardIds: string[], resultCardId: string) => {
    const state = get();
    const now = new Date().toISOString();

    // Decrement copies for each sacrificed card
    let collection = [...state.save.collection];
    for (const cardId of selectedCardIds) {
      collection = collection.map((c) =>
        c.cardId === cardId
          ? { ...c, copiesOwned: Math.max(0, c.copiesOwned - 1) }
          : c,
      );
    }

    // Add result card
    const existing = collection.find((c) => c.cardId === resultCardId);
    if (existing) {
      collection = collection.map((c) =>
        c.cardId === resultCardId
          ? { ...c, copiesOwned: c.copiesOwned + 1 }
          : c,
      );
    } else {
      collection.push({
        cardId: resultCardId,
        copiesOwned: 1,
        firstObtainedAt: now,
        highestVariantOwned: null,
        isNew: true,
      });
    }

    set({
      save: {
        ...state.save,
        collection,
        stats: {
          ...state.save.stats,
          totalTradesCompleted: state.save.stats.totalTradesCompleted + 1,
          uniqueCardsOwned: existing
            ? state.save.stats.uniqueCardsOwned
            : state.save.stats.uniqueCardsOwned + 1,
        },
        updatedAt: now,
      },
    });
  },

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

  /**
   * Purchase the next level of an upgrade.
   * Validates affordability, shop level, and max level.
   * Deducts cost, increments level, applies instant effects (e.g. shelf slots).
   */
  purchaseUpgrade: (upgradeId: string) => {
    const state = get();
    const def = getUpgradeById(upgradeId);
    if (!def) return { success: false, reason: "Upgrade not found" };

    const currentLevel = getOwnedLevel(upgradeId, state.save.upgrades);
    const check = canPurchaseUpgrade(
      def,
      currentLevel,
      state.save.shopLevel,
      state.save.softCurrency,
      state.save.upgrades,
    );
    if (!check.canBuy) return { success: false, reason: check.reason };

    const cost = getUpgradeCost(def, currentLevel)!;
    const newLevel = currentLevel + 1;

    // Update upgrade state
    const existingUpgrade = state.save.upgrades.find(
      (u) => u.upgradeId === upgradeId,
    );
    let upgrades: UpgradeState[];
    if (existingUpgrade) {
      upgrades = state.save.upgrades.map((u) =>
        u.upgradeId === upgradeId ? { ...u, levelOwned: newLevel } : u,
      );
    } else {
      upgrades = [...state.save.upgrades, { upgradeId, levelOwned: newLevel }];
    }

    // Build new save
    let newSave: SaveGame = {
      ...state.save,
      softCurrency: state.save.softCurrency - cost,
      upgrades,
      updatedAt: new Date().toISOString(),
    };

    // Instant effects
    if (def.effectType === "shelf_slot") {
      // Add a new shelf slot immediately
      newSave = {
        ...newSave,
        shelves: [
          ...newSave.shelves,
          { productId: null, quantity: 0, markup: 20 },
        ],
      };
    }

    if (def.effectType === "display_case_slots") {
      // Display case capacity is computed dynamically, no instant save change needed
    }

    set({ save: newSave });
    return { success: true, reason: null };
  },

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

  /** Replace the full missions array (used during init and day/week resets). */
  setMissions: (missions: MissionProgress[]) =>
    set((state) => ({
      save: {
        ...state.save,
        missions,
        updatedAt: new Date().toISOString(),
      },
    })),

  /**
   * Claim a completed mission's reward.
   * Validates the mission is completed and not already claimed.
   * Applies the reward (currency, xp, or reputation).
   */
  claimMissionReward: (missionId: string, mission: MissionDefinition) => {
    const state = get();
    const progress = state.save.missions.find((m) => m.missionId === missionId);
    if (!progress || !progress.completed || progress.claimed) return false;

    let newSave: SaveGame = {
      ...state.save,
      missions: state.save.missions.map((m) =>
        m.missionId === missionId ? { ...m, claimed: true } : m,
      ),
      updatedAt: new Date().toISOString(),
    };

    // Apply reward
    switch (mission.rewardType) {
      case "currency":
        newSave = {
          ...newSave,
          softCurrency: newSave.softCurrency + mission.rewardValue,
        };
        break;
      case "xp": {
        const xpResult = applyXP(
          newSave.xp,
          newSave.shopLevel,
          newSave.xpToNextLevel,
          mission.rewardValue,
        );
        newSave = {
          ...newSave,
          xp: xpResult.xp,
          shopLevel: xpResult.level,
          xpToNextLevel: xpResult.xpToNextLevel,
        };
        break;
      }
      case "reputation":
        newSave = {
          ...newSave,
          reputation: newSave.reputation + mission.rewardValue,
        };
        break;
    }

    set({ save: newSave });
    return true;
  },

  // ── Tick dispatch ────────────────────────────────

  applyTickResult: (patch) =>
    set((state) => {
      const {
        dayElapsedMs,
        lastTickAt,
        currentPhase,
        revenue,
        costOfGoods,
        productId,
        quantity,
        customerVisited,
        customerPurchased,
        updatedShelves,
        notification,
      } = patch;

      const now = new Date().toISOString();
      let newSave: SaveGame = {
        ...state.save,
        dayElapsedMs,
        lastTickAt,
        currentPhase,
        updatedAt: now,
      };

      // Apply sale
      if (revenue > 0 && productId) {
        newSave = {
          ...newSave,
          softCurrency: newSave.softCurrency + revenue,
          shelves: updatedShelves ?? newSave.shelves,
          todayReport: {
            ...newSave.todayReport,
            revenue: newSave.todayReport.revenue + revenue,
            costOfGoodsSold: newSave.todayReport.costOfGoodsSold + costOfGoods,
            productsSold: {
              ...newSave.todayReport.productsSold,
              [productId]:
                (newSave.todayReport.productsSold[productId] ?? 0) + quantity,
            },
          },
          stats: {
            ...newSave.stats,
            totalSales: newSave.stats.totalSales + quantity,
            totalRevenue: newSave.stats.totalRevenue + revenue,
          },
        };
      }

      // Record customer visit
      if (customerVisited) {
        newSave = {
          ...newSave,
          todayReport: {
            ...newSave.todayReport,
            customersVisited: newSave.todayReport.customersVisited + 1,
            customersPurchased:
              newSave.todayReport.customersPurchased +
              (customerPurchased ? 1 : 0),
          },
          stats: {
            ...newSave.stats,
            totalCustomersServed: newSave.stats.totalCustomersServed + 1,
          },
        };
      }

      // Add notification (cap at 50)
      const newNotifications = notification
        ? [notification, ...state.notifications].slice(0, 50)
        : state.notifications;

      return { save: newSave, notifications: newNotifications };
    }),

  applyDayTransition: (result: EndDayResult) =>
    set({ save: result.updatedSave, notifications: [], endDayResult: result }),

  clearEndDayResult: () => set({ endDayResult: null }),

  addNotification: (n: ShopNotification) =>
    set((state) => ({
      notifications: [n, ...state.notifications].slice(0, 50),
    })),

  clearNotifications: () => set({ notifications: [] }),

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

  // ── Preferences ──────────────────────────────────

  setNotificationPreference: (enabled: boolean) =>
    set((state) => ({
      save: {
        ...state.save,
        notificationPreference: enabled,
        updatedAt: new Date().toISOString(),
      },
    })),

  // ── Shop Areas (M14) ─────────────────────────────

  buildArea: (areaId: ShopAreaType) => {
    const state = get();
    const check = canBuildArea(
      state.save.shopAreas,
      areaId,
      state.save.softCurrency,
      state.save.shopLevel,
    );
    if (!check.canBuild) return { success: false, reason: check.reason };

    const def = getAreaDefinition(areaId)!;
    const cost = def.buildCost;

    // Add or update the area entry as built at tier 1
    const existing = state.save.shopAreas.find((a) => a.areaId === areaId);
    const shopAreas: ShopArea[] = existing
      ? state.save.shopAreas.map((a) =>
          a.areaId === areaId ? { ...a, isBuilt: true, tier: 1 } : a,
        )
      : [...state.save.shopAreas, { areaId, isBuilt: true, tier: 1 }];

    set({
      save: {
        ...state.save,
        softCurrency: state.save.softCurrency - cost,
        shopAreas,
        updatedAt: new Date().toISOString(),
      },
    });
    return { success: true, reason: null };
  },

  upgradeArea: (areaId: ShopAreaType) => {
    const state = get();
    const check = canUpgradeArea(
      state.save.shopAreas,
      areaId,
      state.save.softCurrency,
    );
    if (!check.canUpgrade) return { success: false, reason: check.reason };

    const shopAreas: ShopArea[] = state.save.shopAreas.map((a) =>
      a.areaId === areaId ? { ...a, tier: a.tier + 1 } : a,
    );

    set({
      save: {
        ...state.save,
        softCurrency: state.save.softCurrency - check.cost,
        shopAreas,
        updatedAt: new Date().toISOString(),
      },
    });
    return { success: true, reason: null };
  },

  // ── UI ───────────────────────────────────────────

  setLoading: (loading: boolean) => set({ isLoading: loading }),

  setHydrated: (hydrated: boolean) => set({ hasHydrated: hydrated }),

  // ── Staff (M15) ───────────────────────────────────

  hireStaffMember: (candidateId: string) => {
    const state = get();
    const candidate = state.save.staffCandidates.find(
      (c) => c.id === candidateId,
    );
    if (!candidate) return { success: false, reason: "Candidate not found" };

    const member = engineHireStaff(
      candidate,
      state.save.staff,
      state.save.shopLevel,
      state.save.currentDay,
    );
    if (!member) {
      return { success: false, reason: "No staff slots available" };
    }

    if (state.save.softCurrency < candidate.salary) {
      return {
        success: false,
        reason: "Not enough G to cover first day's salary",
      };
    }

    set({
      save: {
        ...state.save,
        staff: [...state.save.staff, member],
        // Remove hired candidate from pool
        staffCandidates: state.save.staffCandidates.filter(
          (c) => c.id !== candidateId,
        ),
        updatedAt: new Date().toISOString(),
      },
    });
    return { success: true, reason: null };
  },

  fireStaffMember: (staffId: string) =>
    set((state) => ({
      save: {
        ...state.save,
        staff: engineFireStaff(state.save.staff, staffId),
        updatedAt: new Date().toISOString(),
      },
    })),

  giveStaffRaise: (staffId: string, raiseAmount: number) => {
    const state = get();
    const member = state.save.staff.find((s) => s.id === staffId);
    if (!member) return { success: false, reason: "Staff member not found" };
    if (raiseAmount <= 0)
      return { success: false, reason: "Raise must be positive" };

    set({
      save: {
        ...state.save,
        staff: engineGiveRaise(state.save.staff, staffId, raiseAmount),
        updatedAt: new Date().toISOString(),
      },
    });
    return { success: true, reason: null };
  },

  refreshStaffCandidates: () =>
    set((state) => ({
      save: {
        ...state.save,
        staffCandidates: generateCandidates(
          state.save.currentDay,
          state.save.shopLevel,
        ),
        staffCandidatesRefreshedDay: state.save.currentDay,
        updatedAt: new Date().toISOString(),
      },
    })),

  // ── Player Events (M17) ───────────────────────────────────────────

  planEvent: (type: PlayerEventType) => {
    const state = get();
    const check = checkEventRequirements(
      type,
      state.save.shopLevel,
      state.save.softCurrency,
      state.save.shopAreas,
      state.save.staff ?? [],
      state.save.plannedEvents ?? [],
      state.save.playerEventCooldowns ?? {},
      state.save.currentDay,
    );
    if (!check.canPlan)
      return {
        success: false,
        reason: check.reasons[0] ?? "Cannot plan event",
      };

    const planned = createPlannedEvent(type, state.save.currentDay);

    set({
      save: {
        ...state.save,
        softCurrency: state.save.softCurrency - planned.cost,
        plannedEvents: [...(state.save.plannedEvents ?? []), planned],
        updatedAt: new Date().toISOString(),
      },
    });
    return { success: true, reason: null };
  },

  cancelPlannedEvent: (eventId: string) =>
    set((state) => {
      const plannedEvents = (state.save.plannedEvents ?? []).map((e) =>
        e.id === eventId ? engineCancelPlannedEvent(e) : e,
      );
      return {
        save: {
          ...state.save,
          plannedEvents,
          updatedAt: new Date().toISOString(),
        },
      };
    }),
}));

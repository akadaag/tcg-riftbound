/**
 * Core game type definitions for Riftbound Shop
 * These map to the Data Model defined in the masterplan.
 */

// ============================================
// Catalog Types (Content Data)
// ============================================

export type Rarity =
  | "common"
  | "uncommon"
  | "rare"
  | "epic"
  | "legendary"
  | "mythic";

export type ProductType = "booster_pack" | "booster_box" | "starter" | "bundle";

export interface CardDefinition {
  id: string;
  externalId: string;
  name: string;
  setCode: string;
  setName: string;
  collectorNumber: string;
  rarity: Rarity;
  imageUrl: string;
  tags: string[];
  type: string;
  variantFlags: string[];
}

export interface CardGameplayMeta {
  cardId: string;
  baseValue: number;
  collectorScore: number;
  playableScore: number;
  displayScore: number;
  pullWeight: number;
}

export interface SetDefinition {
  setCode: string;
  setName: string;
  releaseOrder: number;
  hypeBase: number;
  completionReward: CompletionReward;
}

export interface CompletionReward {
  type: "currency" | "unlock_product" | "cosmetic";
  value: number;
  description: string;
}

export interface ProductDefinition {
  id: string;
  name: string;
  setCode: string;
  productType: ProductType;
  buyPrice: number;
  sellPriceBase: number;
  cardsPerPack: number;
  unlockRequirement: string | null;
  dropTableId: string;
}

// ============================================
// Player Save Types (Game State)
// ============================================

export interface InventoryItem {
  productId: string;
  ownedQuantity: number;
  listedQuantity: number;
}

export interface CollectionEntry {
  cardId: string;
  copiesOwned: number;
  firstObtainedAt: string;
  highestVariantOwned: string | null;
  isNew: boolean;
}

export interface UpgradeState {
  upgradeId: string;
  levelOwned: number;
}

export interface MissionProgress {
  missionId: string;
  currentValue: number;
  completed: boolean;
  claimed: boolean;
}

export interface ShopStats {
  totalSales: number;
  totalRevenue: number;
  totalPacksOpened: number;
  totalCardsCollected: number;
  totalCustomersServed: number;
  uniqueCardsOwned: number;
}

// ============================================
// Save Game (Full Player State)
// ============================================

export interface SaveGame {
  userId: string;
  saveVersion: number;
  updatedAt: string;
  shopLevel: number;
  softCurrency: number;
  reputation: number;
  currentDay: number;
  inventory: InventoryItem[];
  collection: CollectionEntry[];
  upgrades: UpgradeState[];
  missions: MissionProgress[];
  stats: ShopStats;
}

// ============================================
// UI / Misc Types
// ============================================

export type SyncStatus =
  | "synced"
  | "saving_locally"
  | "syncing_cloud"
  | "offline"
  | "sync_error";

export interface UserProfile {
  id: string;
  email: string;
  createdAt: string;
  lastLoginAt: string;
  displayName: string | null;
}

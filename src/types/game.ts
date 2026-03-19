/**
 * Core game type definitions for Riftbound Shop
 * These map to the Data Model defined in the masterplan.
 *
 * Rarity/type/domain values aligned with the real Riftbound TCG
 * and the RiftCodex API (https://api.riftcodex.com).
 */

// ============================================
// Catalog Types (Content Data)
// ============================================

/**
 * The four gameplay rarities plus "showcase" which is the RiftCodex API's
 * catch-all for variant printings (alt-art, overnumbered, signature).
 */
export type Rarity = "common" | "uncommon" | "rare" | "epic" | "showcase";

/** Variant sub-type — only meaningful when rarity === "showcase". */
export type ShowcaseVariant = "alternate_art" | "overnumbered" | "signature";

/** Riftbound card types. */
export type CardType =
  | "battlefield"
  | "gear"
  | "legend"
  | "rune"
  | "spell"
  | "unit";

/** Riftbound supertypes. */
export type Supertype = "basic" | "champion" | "signature" | "token";

/** Riftbound domains (colours/factions). */
export type Domain =
  | "body"
  | "calm"
  | "chaos"
  | "colorless"
  | "fury"
  | "mind"
  | "order";

export type ProductType = "booster_pack" | "booster_box" | "starter" | "bundle";

/** Card orientation for display purposes. */
export type CardOrientation = "portrait" | "landscape";

// --------------- Card Definition ---------------

export interface CardAttributes {
  energy: number | null;
  might: number | null;
  power: number | null;
}

export interface CardMetadata {
  cleanName: string;
  alternateArt: boolean;
  overnumbered: boolean;
  signature: boolean;
}

export interface CardDefinition {
  /** Internal UUID from RiftCodex. */
  id: string;
  /** RiftCodex riftbound_id (e.g. "ogn-021-298"). */
  riftboundId: string;
  /** Human-readable public code (e.g. "OGN-021/298"). */
  publicCode: string;
  name: string;
  setCode: string;
  setName: string;
  collectorNumber: number;
  rarity: Rarity;
  cardType: CardType;
  supertype: Supertype | null;
  domains: Domain[];
  attributes: CardAttributes;
  textPlain: string | null;
  textRich: string | null;
  imageUrl: string;
  artist: string | null;
  accessibilityText: string | null;
  orientation: CardOrientation;
  tags: string[];
  /** Only set when rarity === "showcase". */
  showcaseVariant: ShowcaseVariant | null;
  metadata: CardMetadata;
}

// --------------- Card Gameplay Meta ---------------

export interface CardGameplayMeta {
  cardId: string;
  /** Base shop-sale value in soft currency. */
  baseValue: number;
  /** Weight used by the collection-score formula. */
  collectorScore: number;
  /** How "playable" the card is perceived — drives competitive-fan demand. */
  playableScore: number;
  /** Visual/display appeal score — drives casual interest. */
  displayScore: number;
  /** Relative pull weight inside its rarity tier (higher = more common pull). */
  pullWeight: number;
}

// --------------- Set Definition ---------------

export interface CompletionReward {
  type: "currency" | "unlock_product" | "cosmetic";
  value: number;
  description: string;
}

export interface SetDefinition {
  setCode: string;
  setName: string;
  /** Number of cards in the base set (excludes showcase variants). */
  baseCardCount: number;
  /** Total card count including showcase variants. */
  totalCardCount: number;
  releaseOrder: number;
  publishDate: string | null;
  tcgplayerId: number | null;
  /** Base hype multiplier for customer demand. */
  hypeBase: number;
  completionReward: CompletionReward;
}

// --------------- Product / Drop Table ---------------

/**
 * A single slot in a pack's drop table.
 * Each slot defines a pool of cards and the probability of each rarity
 * within that pool.
 */
export interface DropTableSlot {
  /** Human-readable label (e.g. "Common slot", "Rare-or-better slot"). */
  label: string;
  /** How many cards this slot produces. */
  count: number;
  /**
   * Pool filter — which cards are eligible for this slot.
   * Cards must match ALL specified filters (AND logic).
   */
  pool: {
    /** If set, only cards from these sets. */
    setCodes?: string[];
    /** If set, only cards of these rarities. */
    rarities?: Rarity[];
    /** If set, only cards of these types. */
    cardTypes?: CardType[];
    /** If set, only cards of these supertypes. */
    supertypes?: Supertype[];
    /** If set, only showcase variants of these kinds. */
    showcaseVariants?: ShowcaseVariant[];
    /** If true, exclude showcase variants from the pool. */
    excludeShowcase?: boolean;
  };
  /**
   * Weighted rarity distribution within this slot's pool.
   * Keys are rarity names, values are relative weights.
   * Omitted rarities have weight 0.
   */
  rarityWeights: Partial<Record<Rarity, number>>;
}

export interface DropTable {
  id: string;
  /** Display name for the drop table. */
  name: string;
  slots: DropTableSlot[];
}

export interface ProductDefinition {
  id: string;
  name: string;
  setCode: string;
  productType: ProductType;
  /** Cost for the player to buy from the distributor. */
  buyPrice: number;
  /** Base price customers will pay. */
  sellPriceBase: number;
  /** Total cards per unit (e.g. 14 for a booster pack). */
  cardsPerUnit: number;
  /** For boxes: how many packs inside. null for non-box products. */
  packsPerUnit: number | null;
  /** Prerequisite to unlock this product. null = available from start. */
  unlockRequirement: string | null;
  /** References a DropTable.id. null for products that don't open packs (e.g. box is just N packs). */
  dropTableId: string | null;
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

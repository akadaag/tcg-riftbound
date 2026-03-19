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
// Gameplay Types (Shop / Customers / Events)
// ============================================

// --------------- Shelf System ---------------

export interface ShelfSlot {
  /** Which product is on this shelf. null = empty slot. */
  productId: string | null;
  /** How many units stocked on this shelf. */
  quantity: number;
  /** Player-set markup percentage (0-100). Sell price = base * (1 + markup/100). */
  markup: number;
}

// --------------- Customer System ---------------

export type CustomerType =
  | "casual"
  | "collector"
  | "competitive"
  | "kid"
  | "whale";

export interface Customer {
  id: string;
  type: CustomerType;
  name: string;
  /** Max amount they'll spend in a visit. */
  budget: number;
  /** Set codes they prefer. Empty = any. */
  preferredSets: string[];
  /** Product types they prefer. Empty = any. */
  preferredProducts: ProductType[];
  /** 0-1: how tolerant of markup. 0 = only buys cheap, 1 = price insensitive. */
  priceTolerance: number;
  /** 0-1: how long they browse. Higher = more patience, checks more shelves. */
  patience: number;
}

export interface CustomerVisitResult {
  customer: Customer;
  purchased: boolean;
  productId: string | null;
  quantity: number;
  revenue: number;
  satisfaction: number;
}

// --------------- Event System ---------------

export type GameEventType =
  | "tournament_weekend"
  | "collector_convention"
  | "holiday_rush"
  | "influencer_visit"
  | "distributor_sale"
  | "supply_shortage"
  | "new_set_hype"
  | "lucky_week"
  | "double_xp";

export interface GameEvent {
  id: string;
  type: GameEventType;
  name: string;
  description: string;
  /** Which day the event starts. */
  startDay: number;
  /** How many days the event lasts. */
  duration: number;
  /** Multiplier to customer traffic (1.0 = normal). */
  trafficMultiplier: number;
  /** Multiplier to customer budgets (1.0 = normal). */
  budgetMultiplier: number;
  /** Multiplier to customer price tolerance (1.0 = normal). */
  priceToleranceMultiplier: number;
  /** Bonus to specific customer types. Keys are CustomerType. */
  customerTypeBonus: Partial<Record<CustomerType, number>>;
  /** Multiplier to wholesale prices (1.0 = normal, 0.85 = 15% discount). */
  wholesaleMultiplier: number;
  /** Bonus to pack opening rarity upgrade chance (0.0 = none, 0.05 = +5%). */
  rarityBoostChance: number;
  /** XP multiplier (1.0 = normal, 2.0 = double). */
  xpMultiplier: number;
  /** Which sets are affected. Empty = all. */
  affectedSets: string[];
}

// --------------- Hype Tracker ---------------

export interface SetHype {
  setCode: string;
  /** Current hype level (0-100). Affects customer demand and willingness to pay. */
  currentHype: number;
  /** Base hype before modifiers. */
  baseHype: number;
}

// --------------- Day Report ---------------

export interface DayReport {
  day: number;
  /** Revenue earned from customer sales. */
  revenue: number;
  /** Cost of goods sold (wholesale cost of items customers bought). */
  costOfGoodsSold: number;
  /** Net profit = revenue - costOfGoodsSold. */
  profit: number;
  /** Number of customers who visited. */
  customersVisited: number;
  /** Number of customers who purchased. */
  customersPurchased: number;
  /** Products sold breakdown: productId → quantity. */
  productsSold: Record<string, number>;
  /** Packs opened by the player today. */
  packsOpened: number;
  /** New unique cards discovered today. */
  newCardsDiscovered: number;
  /** XP earned this day. */
  xpEarned: number;
  /** Active events during this day. */
  activeEvents: string[];
}

/** Report generated when the player returns after being away. */
export interface OfflineReport {
  /** Hours elapsed since last play (capped at 8). */
  hoursElapsed: number;
  /** Revenue earned while away. */
  revenue: number;
  /** Products sold while away. */
  productsSold: Record<string, number>;
  /** Total items sold. */
  totalItemsSold: number;
  /** Customers who visited while away. */
  customersServed: number;
}

// ============================================
// Upgrade System
// ============================================

export type UpgradeCategory =
  | "shelves"
  | "traffic"
  | "reputation"
  | "xp"
  | "wholesale"
  | "display_case"
  | "tolerance"
  | "storage";

export type UpgradeEffectType =
  | "shelf_slot"
  | "traffic_multiplier"
  | "reputation_per_day"
  | "xp_multiplier"
  | "wholesale_discount"
  | "display_case_slots"
  | "tolerance_bonus"
  | "inventory_capacity";

export interface UpgradeDefinition {
  id: string;
  category: UpgradeCategory;
  name: string;
  description: string;
  /** Cost to purchase each level. Index 0 = cost for level 1, etc. */
  costs: number[];
  /** Maximum upgrade level. */
  maxLevel: number;
  /** What effect this upgrade applies. */
  effectType: UpgradeEffectType;
  /** Numeric effect value per level (additive or multiplicative depending on effectType). */
  effectPerLevel: number;
  /** Minimum shop level required to see/buy this upgrade. */
  minShopLevel: number;
  /** Icon hint for the UI (emoji). */
  icon: string;
}

// ============================================
// Mission System
// ============================================

export type MissionScope = "daily" | "weekly" | "milestone";

export type MissionType =
  | "sell_items"
  | "earn_revenue"
  | "open_packs"
  | "discover_cards"
  | "complete_set_pct"
  | "serve_customers"
  | "reach_shop_level"
  | "earn_profit";

export interface MissionDefinition {
  id: string;
  scope: MissionScope;
  type: MissionType;
  title: string;
  description: string;
  /** Target value to reach (e.g. sell 10 items → target = 10). */
  targetValue: number;
  /** Reward type: currency, xp, or reputation. */
  rewardType: "currency" | "xp" | "reputation";
  /** Reward amount. */
  rewardValue: number;
  /** Minimum shop level to be offered this mission (for daily/weekly scaling). */
  minShopLevel: number;
}

// ============================================
// Player Save Types (Game State)
// ============================================

export interface InventoryItem {
  productId: string;
  /** Packs/products owned in the "back room" (not on shelves). */
  ownedQuantity: number;
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

  // --- Shop ---
  shopLevel: number;
  softCurrency: number;
  reputation: number;
  currentDay: number;
  /** XP toward next shop level. */
  xp: number;
  /** XP required to reach next shop level. */
  xpToNextLevel: number;
  /** ISO timestamp of last active play session. Used for offline calc. */
  lastPlayedAt: string;

  // --- Shelves ---
  /** Shop shelf slots. Length = number of shelves unlocked. */
  shelves: ShelfSlot[];

  // --- Inventory & Collection ---
  inventory: InventoryItem[];
  collection: CollectionEntry[];
  /** Card IDs placed in the display case (boosts reputation + collector traffic). */
  displayCase: string[];

  // --- Hype ---
  /** Per-set hype state. */
  setHype: SetHype[];

  // --- Events ---
  /** Currently scheduled/active events. */
  activeEvents: GameEvent[];
  /** IDs of events already seen (prevents repeats too soon). */
  pastEventIds: string[];

  // --- Progression ---
  upgrades: UpgradeState[];
  missions: MissionProgress[];
  /** Product IDs the player has unlocked access to. */
  unlockedProducts: string[];

  // --- Today tracking ---
  /** Tracks what happened today (reset on day advance). */
  todayReport: DayReport;

  // --- Lifetime stats ---
  stats: ShopStats;
}

// ============================================
// XP / Level Thresholds
// ============================================

/** XP required for each shop level (index = level, value = XP needed). */
export const XP_THRESHOLDS: number[] = [
  0, // level 0 (unused)
  0, // level 1 (starting)
  100, // level 2
  250, // level 3
  500, // level 4
  800, // level 5
  1200, // level 6
  1700, // level 7
  2400, // level 8
  3200, // level 9
  4200, // level 10
  5500, // level 11
  7000, // level 12
  9000, // level 13
  11500, // level 14
  14500, // level 15
  18000, // level 16
  22000, // level 17
  27000, // level 18
  33000, // level 19
  40000, // level 20
];

/** Max shop level. */
export const MAX_SHOP_LEVEL = 20;

/** Starting number of shelf slots. */
export const STARTING_SHELVES = 3;

/** Max hours of offline progress accumulated. */
export const MAX_OFFLINE_HOURS = 8;

/** Day-of-week cycle length. */
export const WEEK_LENGTH = 7;

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

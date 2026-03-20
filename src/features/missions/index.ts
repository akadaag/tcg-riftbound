/**
 * Missions Engine — catalog, generation, evaluation, rewards.
 *
 * All functions are pure — no side effects, no store access.
 * @module features/missions
 */

import type {
  MissionDefinition,
  MissionProgress,
  MissionScope,
  SaveGame,
} from "@/types/game";
import { WEEK_LENGTH } from "@/types/game";
import { countCompletedPlayerEvents } from "@/features/engine/event-planner";

// ── Mission Templates ────────────────────────────────────────────────

/**
 * Daily mission templates — scaled by shop level.
 * These are templates; actual targets/rewards are scaled dynamically.
 */
const DAILY_TEMPLATES: Omit<
  MissionDefinition,
  "id" | "targetValue" | "rewardValue"
>[] = [
  {
    scope: "daily",
    type: "sell_items",
    title: "Quick Sales",
    description: "Sell {target} items today.",
    rewardType: "currency",
    minShopLevel: 1,
  },
  {
    scope: "daily",
    type: "earn_revenue",
    title: "Daily Revenue",
    description: "Earn {target} G in revenue today.",
    rewardType: "currency",
    minShopLevel: 1,
  },
  {
    scope: "daily",
    type: "open_packs",
    title: "Pack Enthusiast",
    description: "Open {target} packs today.",
    rewardType: "currency",
    minShopLevel: 1,
  },
  {
    scope: "daily",
    type: "serve_customers",
    title: "Busy Day",
    description: "Serve {target} customers today.",
    rewardType: "xp",
    minShopLevel: 1,
  },
  {
    scope: "daily",
    type: "discover_cards",
    title: "New Discoveries",
    description: "Discover {target} new cards today.",
    rewardType: "currency",
    minShopLevel: 1,
  },
  {
    scope: "daily",
    type: "earn_profit",
    title: "Profit Maker",
    description: "Earn {target} G profit today.",
    rewardType: "currency",
    minShopLevel: 2,
  },
  {
    scope: "daily",
    type: "sell_singles",
    title: "Singles Seller",
    description: "Sell {target} singles today.",
    rewardType: "currency",
    minShopLevel: 4,
  },
];

const WEEKLY_TEMPLATES: Omit<
  MissionDefinition,
  "id" | "targetValue" | "rewardValue"
>[] = [
  {
    scope: "weekly",
    type: "sell_items",
    title: "Weekly Sales Target",
    description: "Sell {target} items this week.",
    rewardType: "currency",
    minShopLevel: 1,
  },
  {
    scope: "weekly",
    type: "earn_revenue",
    title: "Weekly Revenue Goal",
    description: "Earn {target} G this week.",
    rewardType: "currency",
    minShopLevel: 1,
  },
  {
    scope: "weekly",
    type: "open_packs",
    title: "Pack Collector",
    description: "Open {target} packs this week.",
    rewardType: "xp",
    minShopLevel: 1,
  },
  {
    scope: "weekly",
    type: "serve_customers",
    title: "Customer Champion",
    description: "Serve {target} customers this week.",
    rewardType: "reputation",
    minShopLevel: 2,
  },
  {
    scope: "weekly",
    type: "discover_cards",
    title: "Card Explorer",
    description: "Discover {target} new cards this week.",
    rewardType: "currency",
    minShopLevel: 1,
  },
  {
    scope: "weekly",
    type: "sell_singles",
    title: "Weekly Singles",
    description: "Sell {target} singles this week.",
    rewardType: "currency",
    minShopLevel: 4,
  },
  {
    scope: "weekly",
    type: "complete_trades",
    title: "Trade Route",
    description: "Complete {target} trades this week.",
    rewardType: "reputation",
    minShopLevel: 5,
  },
];

/** Milestone missions — permanent, one-time achievements. */
const MILESTONE_MISSIONS: MissionDefinition[] = [
  {
    id: "ms_level_3",
    scope: "milestone",
    type: "reach_shop_level",
    title: "Getting Started",
    description: "Reach Shop Level 3.",
    targetValue: 3,
    rewardType: "currency",
    rewardValue: 500,
    minShopLevel: 1,
  },
  {
    id: "ms_level_5",
    scope: "milestone",
    type: "reach_shop_level",
    title: "Growing Business",
    description: "Reach Shop Level 5.",
    targetValue: 5,
    rewardType: "currency",
    rewardValue: 1000,
    minShopLevel: 1,
  },
  {
    id: "ms_level_10",
    scope: "milestone",
    type: "reach_shop_level",
    title: "Established Shop",
    description: "Reach Shop Level 10.",
    targetValue: 10,
    rewardType: "currency",
    rewardValue: 3000,
    minShopLevel: 1,
  },
  {
    id: "ms_level_15",
    scope: "milestone",
    type: "reach_shop_level",
    title: "Premium Destination",
    description: "Reach Shop Level 15.",
    targetValue: 15,
    rewardType: "currency",
    rewardValue: 5000,
    minShopLevel: 1,
  },
  {
    id: "ms_level_20",
    scope: "milestone",
    type: "reach_shop_level",
    title: "Legendary Shop",
    description: "Reach Shop Level 20.",
    targetValue: 20,
    rewardType: "currency",
    rewardValue: 10000,
    minShopLevel: 1,
  },
  {
    id: "ms_sales_100",
    scope: "milestone",
    type: "sell_items",
    title: "First Hundred",
    description: "Sell 100 items total.",
    targetValue: 100,
    rewardType: "currency",
    rewardValue: 300,
    minShopLevel: 1,
  },
  {
    id: "ms_sales_500",
    scope: "milestone",
    type: "sell_items",
    title: "Retail Pro",
    description: "Sell 500 items total.",
    targetValue: 500,
    rewardType: "currency",
    rewardValue: 1500,
    minShopLevel: 1,
  },
  {
    id: "ms_sales_2000",
    scope: "milestone",
    type: "sell_items",
    title: "Sales Legend",
    description: "Sell 2000 items total.",
    targetValue: 2000,
    rewardType: "currency",
    rewardValue: 5000,
    minShopLevel: 1,
  },
  {
    id: "ms_packs_50",
    scope: "milestone",
    type: "open_packs",
    title: "Pack Ripper",
    description: "Open 50 packs total.",
    targetValue: 50,
    rewardType: "currency",
    rewardValue: 500,
    minShopLevel: 1,
  },
  {
    id: "ms_packs_200",
    scope: "milestone",
    type: "open_packs",
    title: "Pack Addict",
    description: "Open 200 packs total.",
    targetValue: 200,
    rewardType: "currency",
    rewardValue: 2000,
    minShopLevel: 1,
  },
  {
    id: "ms_cards_100",
    scope: "milestone",
    type: "discover_cards",
    title: "Budding Collector",
    description: "Discover 100 unique cards.",
    targetValue: 100,
    rewardType: "currency",
    rewardValue: 500,
    minShopLevel: 1,
  },
  {
    id: "ms_cards_300",
    scope: "milestone",
    type: "discover_cards",
    title: "Avid Collector",
    description: "Discover 300 unique cards.",
    targetValue: 300,
    rewardType: "currency",
    rewardValue: 2000,
    minShopLevel: 1,
  },
  {
    id: "ms_cards_600",
    scope: "milestone",
    type: "discover_cards",
    title: "Master Collector",
    description: "Discover all 656 unique cards.",
    targetValue: 600,
    rewardType: "currency",
    rewardValue: 10000,
    minShopLevel: 1,
  },
  {
    id: "ms_revenue_10k",
    scope: "milestone",
    type: "earn_revenue",
    title: "Big Earner",
    description: "Earn 10,000 G lifetime revenue.",
    targetValue: 10000,
    rewardType: "xp",
    rewardValue: 200,
    minShopLevel: 1,
  },
  {
    id: "ms_revenue_100k",
    scope: "milestone",
    type: "earn_revenue",
    title: "Mogul",
    description: "Earn 100,000 G lifetime revenue.",
    targetValue: 100000,
    rewardType: "xp",
    rewardValue: 1000,
    minShopLevel: 1,
  },
  {
    id: "ms_customers_500",
    scope: "milestone",
    type: "serve_customers",
    title: "Community Pillar",
    description: "Serve 500 customers total.",
    targetValue: 500,
    rewardType: "reputation",
    rewardValue: 50,
    minShopLevel: 1,
  },
  {
    id: "ms_collection_25pct",
    scope: "milestone",
    type: "complete_set_pct",
    title: "Quarter Collection",
    description: "Own 25% of all available cards.",
    targetValue: 25,
    rewardType: "currency",
    rewardValue: 2000,
    minShopLevel: 1,
  },
  {
    id: "ms_collection_50pct",
    scope: "milestone",
    type: "complete_set_pct",
    title: "Half Collection",
    description: "Own 50% of all available cards.",
    targetValue: 50,
    rewardType: "currency",
    rewardValue: 5000,
    minShopLevel: 1,
  },
  {
    id: "ms_events_1",
    scope: "milestone",
    type: "host_player_events",
    title: "Event Organiser",
    description: "Host your first player event.",
    targetValue: 1,
    rewardType: "currency",
    rewardValue: 500,
    minShopLevel: 4,
  },
  {
    id: "ms_events_5",
    scope: "milestone",
    type: "host_player_events",
    title: "Regular Host",
    description: "Host 5 player events.",
    targetValue: 5,
    rewardType: "currency",
    rewardValue: 2000,
    minShopLevel: 4,
  },
  {
    id: "ms_events_15",
    scope: "milestone",
    type: "host_player_events",
    title: "Community Hub",
    description: "Host 15 player events.",
    targetValue: 15,
    rewardType: "currency",
    rewardValue: 5000,
    minShopLevel: 4,
  },
  // --- M19: New milestone missions ---
  {
    id: "ms_staff_1",
    scope: "milestone",
    type: "hire_staff",
    title: "First Hire",
    description: "Hire your first staff member.",
    targetValue: 1,
    rewardType: "currency",
    rewardValue: 300,
    minShopLevel: 3,
  },
  {
    id: "ms_staff_5",
    scope: "milestone",
    type: "hire_staff",
    title: "Growing Team",
    description: "Have 5 staff members.",
    targetValue: 5,
    rewardType: "currency",
    rewardValue: 1500,
    minShopLevel: 3,
  },
  {
    id: "ms_area_2",
    scope: "milestone",
    type: "build_area",
    title: "Expanding Grounds",
    description: "Build 2 shop areas.",
    targetValue: 2,
    rewardType: "currency",
    rewardValue: 500,
    minShopLevel: 2,
  },
  {
    id: "ms_area_5",
    scope: "milestone",
    type: "build_area",
    title: "Full Complex",
    description: "Build 5 shop areas.",
    targetValue: 5,
    rewardType: "currency",
    rewardValue: 3000,
    minShopLevel: 2,
  },
  {
    id: "ms_singles_50",
    scope: "milestone",
    type: "sell_singles",
    title: "Singles Vendor",
    description: "Sell 50 singles total.",
    targetValue: 50,
    rewardType: "currency",
    rewardValue: 500,
    minShopLevel: 4,
  },
  {
    id: "ms_singles_300",
    scope: "milestone",
    type: "sell_singles",
    title: "Singles Specialist",
    description: "Sell 300 singles total.",
    targetValue: 300,
    rewardType: "currency",
    rewardValue: 3000,
    minShopLevel: 4,
  },
  {
    id: "ms_trades_10",
    scope: "milestone",
    type: "complete_trades",
    title: "Shrewd Trader",
    description: "Complete 10 trades.",
    targetValue: 10,
    rewardType: "reputation",
    rewardValue: 30,
    minShopLevel: 5,
  },
  {
    id: "ms_trades_50",
    scope: "milestone",
    type: "complete_trades",
    title: "Master Trader",
    description: "Complete 50 trades.",
    targetValue: 50,
    rewardType: "reputation",
    rewardValue: 100,
    minShopLevel: 5,
  },
  {
    id: "ms_upgrades_5",
    scope: "milestone",
    type: "buy_upgrades",
    title: "Self-Improvement",
    description: "Purchase 5 upgrades.",
    targetValue: 5,
    rewardType: "xp",
    rewardValue: 150,
    minShopLevel: 2,
  },
  {
    id: "ms_upgrades_15",
    scope: "milestone",
    type: "buy_upgrades",
    title: "Fully Optimised",
    description: "Purchase 15 upgrades.",
    targetValue: 15,
    rewardType: "xp",
    rewardValue: 500,
    minShopLevel: 2,
  },
];

// ── Scaling Functions ────────────────────────────────────────────────

/** Scale daily mission targets by shop level. */
function scaleDailyTarget(type: string, shopLevel: number): number {
  const level = Math.max(1, shopLevel);
  switch (type) {
    case "sell_items":
      return Math.round(3 + level * 1.5);
    case "earn_revenue":
      return Math.round((50 + level * 30) / 10) * 10;
    case "open_packs":
      return Math.max(1, Math.round(1 + level * 0.3));
    case "serve_customers":
      return Math.round(3 + level * 2);
    case "discover_cards":
      return Math.max(1, Math.round(2 + level * 0.5));
    case "earn_profit":
      return Math.round((30 + level * 20) / 10) * 10;
    case "sell_singles":
      return Math.max(1, Math.round(1 + level * 0.5));
    case "complete_trades":
      return Math.max(1, Math.round(0.5 + level * 0.3));
    default:
      return 5;
  }
}

/** Scale daily mission rewards by shop level. */
function scaleDailyReward(rewardType: string, shopLevel: number): number {
  const level = Math.max(1, shopLevel);
  switch (rewardType) {
    case "currency":
      return Math.round((50 + level * 25) / 10) * 10;
    case "xp":
      return Math.round(15 + level * 5);
    case "reputation":
      return Math.round(3 + level * 1);
    default:
      return 50;
  }
}

/** Scale weekly mission targets by shop level. */
function scaleWeeklyTarget(type: string, shopLevel: number): number {
  // Weekly targets are roughly 5x daily (since there are 7 days, but some slack)
  return scaleDailyTarget(type, shopLevel) * 5;
}

/** Scale weekly mission rewards by shop level. */
function scaleWeeklyReward(rewardType: string, shopLevel: number): number {
  return scaleDailyReward(rewardType, shopLevel) * 4;
}

// ── Seeded Random ────────────────────────────────────────────────────

/** Simple deterministic hash for day-based seed. */
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

/** Shuffle array using seeded random. */
function seededShuffle<T>(arr: T[], rand: () => number): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// ── Mission Generation ───────────────────────────────────────────────

/**
 * Generate daily missions for a given day and shop level.
 * Returns 3 daily missions, deterministic by day (so reloading gives the same missions).
 */
export function generateDailyMissions(
  shopLevel: number,
  day: number,
): MissionDefinition[] {
  const rand = seededRandom(day * 7919 + 1);
  const eligible = DAILY_TEMPLATES.filter((t) => shopLevel >= t.minShopLevel);
  const shuffled = seededShuffle(eligible, rand);
  const picked = shuffled.slice(0, 3);

  return picked.map((template, i) => ({
    ...template,
    id: `daily_${day}_${i}`,
    targetValue: scaleDailyTarget(template.type, shopLevel),
    rewardValue: scaleDailyReward(template.rewardType, shopLevel),
    description: template.description.replace(
      "{target}",
      scaleDailyTarget(template.type, shopLevel).toLocaleString(),
    ),
  }));
}

/**
 * Generate weekly missions for a given week.
 * Returns 2 weekly missions.
 */
export function generateWeeklyMissions(
  shopLevel: number,
  day: number,
): MissionDefinition[] {
  const weekNumber = Math.floor((day - 1) / WEEK_LENGTH);
  const rand = seededRandom(weekNumber * 6271 + 3);
  const eligible = WEEKLY_TEMPLATES.filter((t) => shopLevel >= t.minShopLevel);
  const shuffled = seededShuffle(eligible, rand);
  const picked = shuffled.slice(0, 2);

  return picked.map((template, i) => ({
    ...template,
    id: `weekly_${weekNumber}_${i}`,
    targetValue: scaleWeeklyTarget(template.type, shopLevel),
    rewardValue: scaleWeeklyReward(template.rewardType, shopLevel),
    description: template.description.replace(
      "{target}",
      scaleWeeklyTarget(template.type, shopLevel).toLocaleString(),
    ),
  }));
}

/**
 * Get all milestone missions.
 */
export function getMilestoneMissions(): MissionDefinition[] {
  return MILESTONE_MISSIONS;
}

/**
 * Get a mission definition by ID.
 * Searches milestones directly; daily/weekly must be passed in.
 */
export function getMissionById(
  id: string,
  activeMissions: MissionDefinition[],
): MissionDefinition | undefined {
  return (
    activeMissions.find((m) => m.id === id) ??
    MILESTONE_MISSIONS.find((m) => m.id === id)
  );
}

// ── Mission Evaluation ───────────────────────────────────────────────

/**
 * Evaluate the current progress of a mission against the save state.
 *
 * For daily missions: uses todayReport values.
 * For weekly missions: uses todayReport values (accumulated across the week via tracking).
 * For milestones: uses lifetime stats.
 */
export function evaluateMissionProgress(
  mission: MissionDefinition,
  save: SaveGame,
): number {
  switch (mission.type) {
    case "sell_items":
      if (mission.scope === "milestone") return save.stats.totalSales;
      return Object.values(save.todayReport.productsSold).reduce(
        (a, b) => a + b,
        0,
      );
    case "earn_revenue":
      if (mission.scope === "milestone") return save.stats.totalRevenue;
      return save.todayReport.revenue;
    case "open_packs":
      if (mission.scope === "milestone") return save.stats.totalPacksOpened;
      return save.todayReport.packsOpened;
    case "discover_cards":
      if (mission.scope === "milestone") return save.stats.uniqueCardsOwned;
      return save.todayReport.newCardsDiscovered;
    case "serve_customers":
      if (mission.scope === "milestone") return save.stats.totalCustomersServed;
      return save.todayReport.customersVisited;
    case "reach_shop_level":
      return save.shopLevel;
    case "earn_profit":
      return save.todayReport.profit;
    case "complete_set_pct":
      // Progress = percentage of total unique cards owned (656 total across all sets).
      // Milestones use this to reward collection depth at 25 % and 50 % thresholds.
      return Math.floor((save.stats.uniqueCardsOwned / 656) * 100);
    case "host_player_events":
      return countCompletedPlayerEvents(save);
    case "hire_staff":
      return save.staff.length;
    case "build_area":
      return save.shopAreas.filter((a) => a.isBuilt).length;
    case "sell_singles":
      if (mission.scope === "milestone") return save.stats.totalSinglesSold;
      return save.todayReport.singlesSold ?? 0;
    case "complete_trades":
      if (mission.scope === "milestone") return save.stats.totalTradesCompleted;
      // Weekly trades are accumulated via getTodayContribution; no daily tracking.
      return 0;
    case "buy_upgrades":
      return save.upgrades.reduce((sum, u) => sum + u.levelOwned, 0);
    default:
      return 0;
  }
}

/**
 * Check if a mission's progress meets or exceeds its target.
 */
export function isMissionComplete(
  mission: MissionDefinition,
  save: SaveGame,
): boolean {
  return evaluateMissionProgress(mission, save) >= mission.targetValue;
}

// ── Weekly Tracking ──────────────────────────────────────────────────

/**
 * Weekly mission progress needs to accumulate across days.
 * This is stored in the MissionProgress.currentValue field and updated at end of day.
 */
export function accumulateWeeklyProgress(
  mission: MissionDefinition,
  currentProgress: MissionProgress,
  todayContribution: number,
): MissionProgress {
  if (currentProgress.completed) return currentProgress;
  const newValue = currentProgress.currentValue + todayContribution;
  const completed = newValue >= mission.targetValue;
  return { ...currentProgress, currentValue: newValue, completed };
}

/**
 * Get today's contribution for a weekly mission from the day report.
 */
export function getTodayContribution(
  mission: MissionDefinition,
  save: SaveGame,
): number {
  switch (mission.type) {
    case "sell_items":
      return Object.values(save.todayReport.productsSold).reduce(
        (a, b) => a + b,
        0,
      );
    case "earn_revenue":
      return save.todayReport.revenue;
    case "open_packs":
      return save.todayReport.packsOpened;
    case "discover_cards":
      return save.todayReport.newCardsDiscovered;
    case "serve_customers":
      return save.todayReport.customersVisited;
    case "earn_profit":
      return save.todayReport.profit;
    case "sell_singles":
      return save.todayReport.singlesSold;
    case "complete_trades":
      // Trades don't have per-day tracking yet; return 0 for weekly accumulation.
      // Future: add tradesCompleted to DayReport for proper weekly tracking.
      return 0;
    default:
      return 0;
  }
}

// ── Day/Week Reset Logic ─────────────────────────────────────────────

/**
 * Check if we need to reset daily missions (always at day advance).
 */
export function shouldResetDailies(): boolean {
  return true; // Daily missions always reset on day advance
}

/**
 * Check if we need to reset weekly missions.
 * Resets when crossing a week boundary (every WEEK_LENGTH days).
 */
export function shouldResetWeeklies(
  currentDay: number,
  nextDay: number,
): boolean {
  const currentWeek = Math.floor((currentDay - 1) / WEEK_LENGTH);
  const nextWeek = Math.floor((nextDay - 1) / WEEK_LENGTH);
  return nextWeek > currentWeek;
}

/**
 * Initialize mission progress entries for a set of mission definitions.
 */
export function initializeMissionProgress(
  missions: MissionDefinition[],
): MissionProgress[] {
  return missions.map((m) => ({
    missionId: m.id,
    currentValue: 0,
    completed: false,
    claimed: false,
  }));
}

/**
 * Build the full active mission set for a given day.
 * Returns both definitions and initial progress.
 */
export function buildActiveMissions(
  shopLevel: number,
  day: number,
  existingProgress: MissionProgress[],
): {
  dailyMissions: MissionDefinition[];
  weeklyMissions: MissionDefinition[];
  milestoneMissions: MissionDefinition[];
  progress: MissionProgress[];
} {
  const dailyMissions = generateDailyMissions(shopLevel, day);
  const weeklyMissions = generateWeeklyMissions(shopLevel, day);
  const milestoneMissions = getMilestoneMissions();

  // Preserve existing progress for weeklies and milestones that haven't changed
  const progress: MissionProgress[] = [];

  // Daily missions — always fresh
  for (const m of dailyMissions) {
    progress.push({
      missionId: m.id,
      currentValue: 0,
      completed: false,
      claimed: false,
    });
  }

  // Weekly missions — keep existing if same week
  for (const m of weeklyMissions) {
    const existing = existingProgress.find((p) => p.missionId === m.id);
    if (existing) {
      progress.push(existing);
    } else {
      progress.push({
        missionId: m.id,
        currentValue: 0,
        completed: false,
        claimed: false,
      });
    }
  }

  // Milestones — always keep existing progress
  for (const m of milestoneMissions) {
    const existing = existingProgress.find((p) => p.missionId === m.id);
    if (existing) {
      progress.push(existing);
    } else {
      progress.push({
        missionId: m.id,
        currentValue: 0,
        completed: false,
        claimed: false,
      });
    }
  }

  return { dailyMissions, weeklyMissions, milestoneMissions, progress };
}

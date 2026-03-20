/**
 * Day Cycle Engine — manages day advancement, offline progress, and daily resets.
 *
 * Key mechanics:
 * - Offline idle revenue accumulates while away (capped at 8 hours)
 * - "While You Were Away" report on return
 * - Manual "End Day" button advances to next day
 * - Daily summary with XP/events
 *
 * @module features/engine/day-cycle
 */

import type {
  SaveGame,
  DayReport,
  OfflineReport,
  GameEvent,
  ShelfSlot,
  SetHype,
  ProductDefinition,
  MissionProgress,
  MissionDefinition,
  CardGameplayMeta,
  CardDefinition,
  SetDefinition,
} from "@/types/game";
import { MAX_OFFLINE_HOURS } from "@/types/game";

import { simulateOfflinePeriod, generateCustomerWave } from "./customers";
import { simulateOfflineTicks } from "./simulation";
import { calculateDayXP, applyXP } from "./economy";
import { decayHype, applyEventHype } from "./hype";
import {
  getActiveEvents,
  cleanupExpiredEvents,
  shouldScheduleEvent,
  rollNewEvent,
  getRecentEventTypes,
  getCombinedEventModifiers,
} from "./events";
import type { UpgradeModifiers } from "@/features/upgrades";
import {
  getUpgradeModifiers,
  calculateDisplayCaseBonus,
} from "@/features/upgrades";
import { getAreaEffects } from "@/features/engine/areas";
import {
  generateDailyMissions,
  generateWeeklyMissions,
  getMilestoneMissions,
  evaluateMissionProgress,
  isMissionComplete,
  accumulateWeeklyProgress,
  getTodayContribution,
  shouldResetWeeklies,
  initializeMissionProgress,
} from "@/features/missions";
import {
  simulateDaySinglesSales,
  SINGLES_UNLOCK_LEVEL,
} from "@/features/singles";

// ── Offline Progress ─────────────────────────────────────────────────

/**
 * Calculate how many hours have elapsed since last play,
 * capped at MAX_OFFLINE_HOURS.
 */
export function calculateOfflineHours(lastPlayedAt: string): number {
  const now = Date.now();
  const last = new Date(lastPlayedAt).getTime();
  const hoursElapsed = (now - last) / (1000 * 60 * 60);
  return Math.min(MAX_OFFLINE_HOURS, Math.max(0, hoursElapsed));
}

/**
 * Process offline progress when player returns.
 * Returns the offline report and updated save state.
 */
export function calculateOfflineProgress(
  save: SaveGame,
  products: Map<string, ProductDefinition>,
  productSetMap: Map<string, string>,
  getMetaFn?: (cardId: string) => { displayScore: number } | undefined,
  metaLookupFn?: (cardId: string) => CardGameplayMeta | undefined,
  cardLookupFn?: (cardId: string) => CardDefinition | undefined,
): { report: OfflineReport; updatedSave: SaveGame } | null {
  const hours = calculateOfflineHours(save.lastPlayedAt);

  // Need at least 5 minutes away to trigger offline progress
  if (hours < 5 / 60) return null;

  // Check if any shelves have stock to sell
  const hasStock = save.shelves.some(
    (s) => s.productId !== null && s.quantity > 0,
  );
  if (!hasStock) {
    return {
      report: {
        hoursElapsed: Math.round(hours * 10) / 10,
        revenue: 0,
        productsSold: {},
        totalItemsSold: 0,
        customersServed: 0,
        daysSimulated: 0,
      },
      updatedSave: {
        ...save,
        lastPlayedAt: new Date().toISOString(),
        lastTickAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };
  }

  const activeEvents = getActiveEvents(save.activeEvents, save.currentDay);

  // Calculate upgrade modifiers
  const upgradeMods = getUpgradeModifiers(save.upgrades);
  const dcBonus = getMetaFn
    ? calculateDisplayCaseBonus(save.displayCase, getMetaFn)
    : { trafficBonus: 0, totalDisplayScore: 0 };
  // Calculate area effects for offline period
  const areaFx = getAreaEffects(save.shopAreas);

  // Use tick-based simulation engine (M13)
  const simResult = simulateOfflineTicks(
    hours,
    save.shelves,
    save.shopLevel,
    save.reputation,
    activeEvents,
    save.setHype,
    products,
    productSetMap,
    upgradeMods.trafficBonus,
    dcBonus.trafficBonus,
    upgradeMods.toleranceBonus,
  );

  // Simulate offline singles sales (if unlocked and listings exist)
  let offlineSinglesRevenue = 0;
  let offlineSinglesSold = 0;
  let offlineSinglesListings = [...save.singlesListings];
  let offlineCollection = [...save.collection];

  if (
    save.shopLevel >= SINGLES_UNLOCK_LEVEL &&
    save.singlesListings.length > 0 &&
    metaLookupFn &&
    cardLookupFn
  ) {
    // Generate a proportional customer wave for offline singles
    const offlineCustomers = generateCustomerWave(
      save.shopLevel,
      save.reputation,
      activeEvents,
      save.setHype,
      save.shelves,
      productSetMap,
      upgradeMods.trafficBonus,
      dcBonus.trafficBonus,
    );

    // Scale down customer count by offline hours/8 and efficiency
    const offlineEfficiency = 0.6;
    const scaledCount = Math.round(
      offlineCustomers.length * (hours / 8) * offlineEfficiency,
    );
    const scaledCustomers = offlineCustomers.slice(0, scaledCount);

    const eventMods = getCombinedEventModifiers(activeEvents);
    const { sales, remainingListings } = simulateDaySinglesSales(
      scaledCustomers,
      offlineSinglesListings,
      metaLookupFn,
      cardLookupFn,
      eventMods.priceToleranceMultiplier,
      upgradeMods.toleranceBonus,
    );

    for (const sale of sales) {
      offlineSinglesRevenue += sale.revenue;
      offlineSinglesSold += 1;
      offlineCollection = offlineCollection.map((c) =>
        c.cardId === sale.cardId
          ? { ...c, copiesOwned: Math.max(0, c.copiesOwned - 1) }
          : c,
      );
    }
    offlineSinglesListings = remainingListings;
  }

  const totalOfflineRevenue = simResult.revenue + offlineSinglesRevenue;
  // Passive income scaled by days simulated
  const passiveIncome =
    Math.floor(areaFx.passiveIncomePerDay) * simResult.daysSimulated;

  const report: OfflineReport = {
    hoursElapsed: Math.round(hours * 10) / 10,
    revenue: totalOfflineRevenue + passiveIncome,
    productsSold: simResult.productsSold,
    totalItemsSold: simResult.totalItemsSold + offlineSinglesSold,
    customersServed: simResult.customersServed,
    daysSimulated: simResult.daysSimulated,
  };

  const now = new Date().toISOString();
  const updatedSave: SaveGame = {
    ...save,
    softCurrency: save.softCurrency + totalOfflineRevenue + passiveIncome,
    reputation: save.reputation + simResult.reputationGained,
    shelves: simResult.updatedShelves,
    collection: offlineCollection,
    singlesListings: offlineSinglesListings,
    lastPlayedAt: now,
    lastTickAt: now,
    // Reset to morning of the current day after offline period
    currentPhase: "morning",
    dayElapsedMs: 0,
    updatedAt: now,
    stats: {
      ...save.stats,
      totalSales: save.stats.totalSales + simResult.totalItemsSold,
      totalRevenue:
        save.stats.totalRevenue + totalOfflineRevenue + passiveIncome,
      totalCustomersServed:
        save.stats.totalCustomersServed + simResult.customersServed,
      totalSinglesRevenue:
        save.stats.totalSinglesRevenue + offlineSinglesRevenue,
      totalSinglesSold: save.stats.totalSinglesSold + offlineSinglesSold,
    },
    // Update today report with offline sales
    todayReport: {
      ...save.todayReport,
      revenue: save.todayReport.revenue + totalOfflineRevenue + passiveIncome,
      customersVisited:
        save.todayReport.customersVisited + simResult.customersServed,
      customersPurchased:
        save.todayReport.customersPurchased + simResult.totalItemsSold,
      productsSold: mergeProductsSold(
        save.todayReport.productsSold,
        simResult.productsSold,
      ),
      singlesRevenue: save.todayReport.singlesRevenue + offlineSinglesRevenue,
      singlesSold: save.todayReport.singlesSold + offlineSinglesSold,
    },
  };

  return { report, updatedSave };
}

// ── Day Advancement ──────────────────────────────────────────────────

export interface EndDayResult {
  /** The completed day's report. */
  dayReport: DayReport;
  /** XP earned this day. */
  xpEarned: number;
  /** Levels gained (0 or more). */
  levelsGained: number;
  /** New level after XP. */
  newLevel: number;
  /** Event preview for next day (null if no event). */
  nextDayEvent: GameEvent | null;
  /** Updated save state. */
  updatedSave: SaveGame;
  /** Mission progress updates for end-of-day summary. */
  completedMissions: string[];
  /** Sets newly completed today (with name and currency reward). */
  setCompletions: Array<{ setCode: string; setName: string; reward: number }>;
}

/**
 * Advance to the next day. This is the "End Day" action.
 *
 * Steps:
 * 1. Simulate singles sales for today (if unlocked and listings exist)
 * 2. Finalize today's report
 * 3. Calculate and apply XP (with upgrade bonus + singles XP)
 * 4. Apply reputation-per-day from upgrades
 * 5. Decay hype
 * 6. Clean up expired events
 * 7. Maybe schedule a new event
 * 8. Check for newly completed sets and award rewards
 * 9. Auto-populate unlockedProducts for newly reached level
 * 10. Evaluate and update mission progress
 * 11. Reset daily/weekly missions as needed; generate new ones
 * 12. Reset daily tracking
 * 13. Advance day counter
 *
 * @param getMetaFn — optional function to look up gameplay meta for display case bonus and singles
 * @param cardLookupFn — optional function to look up card definitions for singles
 * @param sets — optional set definitions array (for set completion rewards)
 */
export function advanceDay(
  save: SaveGame,
  products: Map<string, ProductDefinition>,
  getMetaFn?: (cardId: string) => { displayScore: number } | undefined,
  cardLookupFn?: (cardId: string) => CardDefinition | undefined,
  metaLookupFn?: (cardId: string) => CardGameplayMeta | undefined,
  productSetMap?: Map<string, string>,
  sets?: SetDefinition[],
): EndDayResult {
  const currentDay = save.currentDay;
  const nextDay = currentDay + 1;

  // Get upgrade modifiers
  const upgradeMods = getUpgradeModifiers(save.upgrades);
  // Get area effects
  const areaEffects = getAreaEffects(save.shopAreas);

  // 1. Simulate singles sales for today's customer wave
  let singlesRevenue = save.todayReport.singlesRevenue;
  let singlesSold = save.todayReport.singlesSold;
  let updatedSinglesListings = [...save.singlesListings];
  let updatedCollection = [...save.collection];
  let updatedStats = { ...save.stats };

  if (
    save.shopLevel >= SINGLES_UNLOCK_LEVEL &&
    save.singlesListings.length > 0 &&
    metaLookupFn &&
    cardLookupFn &&
    productSetMap
  ) {
    // Generate a fresh customer wave for singles browsing
    const activeEventsForSingles = getActiveEvents(
      save.activeEvents,
      currentDay,
    );
    const dcBonus = getMetaFn
      ? calculateDisplayCaseBonus(save.displayCase, getMetaFn)
      : { trafficBonus: 0, totalDisplayScore: 0 };
    const singlesCustomers = generateCustomerWave(
      save.shopLevel,
      save.reputation,
      activeEventsForSingles,
      save.setHype,
      save.shelves,
      productSetMap,
      upgradeMods.trafficBonus,
      dcBonus.trafficBonus,
    );

    const eventMods = getCombinedEventModifiers(activeEventsForSingles);
    const { sales, remainingListings } = simulateDaySinglesSales(
      singlesCustomers,
      updatedSinglesListings,
      metaLookupFn,
      cardLookupFn,
      eventMods.priceToleranceMultiplier,
      upgradeMods.toleranceBonus,
    );

    // Apply singles sales
    for (const sale of sales) {
      singlesRevenue += sale.revenue;
      singlesSold += 1;
      // Decrement copiesOwned for sold card
      updatedCollection = updatedCollection.map((c) =>
        c.cardId === sale.cardId
          ? { ...c, copiesOwned: Math.max(0, c.copiesOwned - 1) }
          : c,
      );
    }
    updatedSinglesListings = remainingListings;

    // Update stats
    updatedStats = {
      ...updatedStats,
      totalSinglesRevenue:
        updatedStats.totalSinglesRevenue +
        singlesRevenue -
        save.todayReport.singlesRevenue,
      totalSinglesSold:
        updatedStats.totalSinglesSold +
        singlesSold -
        save.todayReport.singlesSold,
      totalRevenue:
        updatedStats.totalRevenue +
        singlesRevenue -
        save.todayReport.singlesRevenue,
    };
  }

  // 2. Finalize today's report with profit calculation and singles
  const todayReport: DayReport = {
    ...save.todayReport,
    singlesRevenue,
    singlesSold,
    revenue:
      save.todayReport.revenue +
      (singlesRevenue - save.todayReport.singlesRevenue),
    profit:
      save.todayReport.revenue +
      (singlesRevenue - save.todayReport.singlesRevenue) -
      save.todayReport.costOfGoodsSold,
  };

  // 3. Calculate XP (with upgrade bonus + singles)
  const activeEvents = getActiveEvents(save.activeEvents, currentDay);
  const eventMods = getCombinedEventModifiers(activeEvents);

  const xpEarned = calculateDayXP(
    todayReport.customersPurchased,
    todayReport.packsOpened,
    todayReport.newCardsDiscovered,
    todayReport.revenue,
    eventMods.xpMultiplier,
    upgradeMods.xpBonus,
    todayReport.singlesSold,
  );

  const xpResult = applyXP(
    save.xp,
    save.shopLevel,
    save.xpToNextLevel,
    xpEarned,
  );

  // 3. Apply reputation-per-day from upgrades + areas
  const reputationGain = Math.floor(
    upgradeMods.reputationPerDay + areaEffects.reputationPerDay,
  );

  // 4. Decay hype
  let updatedHype = decayHype(save.setHype);

  // 5. Clean up expired events
  const { activeEvents: remainingEvents, expiredIds } = cleanupExpiredEvents(
    save.activeEvents,
    nextDay,
  );
  const updatedPastIds = [...save.pastEventIds, ...expiredIds];

  // 6. Apply event hype boosts for remaining active events
  const nextDayActive = getActiveEvents(remainingEvents, nextDay);
  updatedHype = applyEventHype(updatedHype, nextDayActive);

  // 7. Maybe schedule a new event
  let newEvent: GameEvent | null = null;
  const lastEventDay =
    remainingEvents.length > 0
      ? Math.max(...remainingEvents.map((e) => e.startDay))
      : 0;

  if (shouldScheduleEvent(nextDay, lastEventDay, xpResult.level)) {
    const recentTypes = getRecentEventTypes(remainingEvents);
    // Pass available set codes so set-specific events can target them
    const availableSetCodes = save.setHype.map((h) => h.setCode);
    newEvent = rollNewEvent(
      nextDay,
      xpResult.level,
      updatedPastIds,
      recentTypes,
      availableSetCodes,
    );
  }

  const allEvents = newEvent ? [...remainingEvents, newEvent] : remainingEvents;

  // 8. Check for newly completed sets and award currency rewards.
  //    A set is "complete" when the player owns at least 1 copy of every card
  //    in that set (totalCardCount includes showcase variants). We track which
  //    sets are already marked completed in save.completedSets so we only award
  //    once per save file.
  const setCompletions: Array<{
    setCode: string;
    setName: string;
    reward: number;
  }> = [];
  let setCompletionBonus = 0;
  const alreadyCompleted = new Set(save.completedSets ?? []);
  const newlyCompleted: string[] = [...alreadyCompleted];

  if (sets && cardLookupFn) {
    const ownedCardIds = new Set(save.collection.map((c) => c.cardId));
    for (const setDef of sets) {
      if (alreadyCompleted.has(setDef.setCode)) continue;
      // Count how many of this set's cards the player owns
      let owned = 0;
      let total = 0;
      for (const entry of save.collection) {
        const card = cardLookupFn(entry.cardId);
        if (card && card.setCode === setDef.setCode) owned++;
      }
      // Use totalCardCount as the completion target (includes showcase variants)
      total = setDef.totalCardCount;
      if (owned >= total && total > 0) {
        newlyCompleted.push(setDef.setCode);
        const reward = setDef.completionReward.value;
        setCompletions.push({
          setCode: setDef.setCode,
          setName: setDef.setName,
          reward,
        });
        setCompletionBonus += reward;
      }
    }
  }

  // 9. Auto-populate unlockedProducts for the newly reached level.
  //    Scan all products and unlock any whose unlockRequirement matches
  //    "shop_level_N" where N <= new level.
  const alreadyUnlocked = new Set(save.unlockedProducts);
  const newUnlockedProducts = [...save.unlockedProducts];
  for (const [, product] of products) {
    if (alreadyUnlocked.has(product.id)) continue;
    if (!product.unlockRequirement) continue;
    const match = product.unlockRequirement.match(/^shop_level_(\d+)$/);
    if (match) {
      const requiredLevel = parseInt(match[1], 10);
      if (xpResult.level >= requiredLevel) {
        newUnlockedProducts.push(product.id);
        alreadyUnlocked.add(product.id);
      }
    }
  }
  const completedMissions: string[] = [];
  let updatedMissions = [...save.missions];

  // Build the full mission definitions for evaluation
  const dailyDefs = generateDailyMissions(save.shopLevel, currentDay);
  const weeklyDefs = generateWeeklyMissions(save.shopLevel, currentDay);
  const milestoneDefs = getMilestoneMissions();
  const allMissionDefs = [...dailyDefs, ...weeklyDefs, ...milestoneDefs];

  // Create a temporary save with updated XP/level for milestone evaluation
  const tempSave: SaveGame = {
    ...save,
    shopLevel: xpResult.level,
    todayReport,
  };

  // Evaluate daily missions (use todayReport directly)
  for (const def of dailyDefs) {
    const progress = updatedMissions.find((m) => m.missionId === def.id);
    if (!progress || progress.completed) continue;
    if (isMissionComplete(def, tempSave)) {
      updatedMissions = updatedMissions.map((m) =>
        m.missionId === def.id
          ? {
              ...m,
              completed: true,
              currentValue: evaluateMissionProgress(def, tempSave),
            }
          : m,
      );
      completedMissions.push(def.id);
    } else {
      updatedMissions = updatedMissions.map((m) =>
        m.missionId === def.id
          ? { ...m, currentValue: evaluateMissionProgress(def, tempSave) }
          : m,
      );
    }
  }

  // Accumulate weekly mission progress
  for (const def of weeklyDefs) {
    const progress = updatedMissions.find((m) => m.missionId === def.id);
    if (!progress || progress.completed) continue;
    const todayContrib = getTodayContribution(def, tempSave);
    const updated = accumulateWeeklyProgress(def, progress, todayContrib);
    updatedMissions = updatedMissions.map((m) =>
      m.missionId === def.id ? updated : m,
    );
    if (updated.completed && !progress.completed) {
      completedMissions.push(def.id);
    }
  }

  // Evaluate milestone missions
  for (const def of milestoneDefs) {
    const progress = updatedMissions.find((m) => m.missionId === def.id);
    if (!progress || progress.completed) continue;
    const currentValue = evaluateMissionProgress(def, tempSave);
    if (currentValue >= def.targetValue) {
      updatedMissions = updatedMissions.map((m) =>
        m.missionId === def.id ? { ...m, completed: true, currentValue } : m,
      );
      completedMissions.push(def.id);
    } else {
      updatedMissions = updatedMissions.map((m) =>
        m.missionId === def.id ? { ...m, currentValue } : m,
      );
    }
  }

  // 9. Reset daily missions (always) and weekly missions (if crossing week boundary)
  const resetWeeklies = shouldResetWeeklies(currentDay, nextDay);

  // Generate new daily missions for next day
  const newDailyDefs = generateDailyMissions(xpResult.level, nextDay);
  const newDailyProgress = initializeMissionProgress(newDailyDefs);

  // Filter out old daily progress, keep weekly + milestones
  let nextDayMissions = updatedMissions.filter(
    (m) => !m.missionId.startsWith("daily_"),
  );

  // Add new daily progress
  nextDayMissions = [...nextDayMissions, ...newDailyProgress];

  // Reset weeklies if needed
  if (resetWeeklies) {
    const newWeeklyDefs = generateWeeklyMissions(xpResult.level, nextDay);
    const newWeeklyProgress = initializeMissionProgress(newWeeklyDefs);
    nextDayMissions = nextDayMissions.filter(
      (m) => !m.missionId.startsWith("weekly_"),
    );
    nextDayMissions = [...nextDayMissions, ...newWeeklyProgress];
  }

  // 10. Build the next day's fresh report
  const freshReport: DayReport = {
    day: nextDay,
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
    activeEvents: getActiveEvents(allEvents, nextDay).map((e) => e.id),
  };

  // 11. Build updated save
  const updatedSave: SaveGame = {
    ...save,
    currentDay: nextDay,
    shopLevel: xpResult.level,
    xp: xpResult.xp,
    xpToNextLevel: xpResult.xpToNextLevel,
    reputation: save.reputation + reputationGain,
    // Add singles revenue delta + set completion bonuses + area passive income
    softCurrency:
      save.softCurrency +
      (singlesRevenue - save.todayReport.singlesRevenue) +
      setCompletionBonus +
      Math.floor(areaEffects.passiveIncomePerDay),
    collection: updatedCollection,
    singlesListings: updatedSinglesListings,
    setHype: updatedHype,
    activeEvents: allEvents,
    pastEventIds: updatedPastIds,
    missions: nextDayMissions,
    completedSets: newlyCompleted,
    unlockedProducts: newUnlockedProducts,
    todayReport: freshReport,
    lastPlayedAt: new Date().toISOString(),
    lastTickAt: new Date().toISOString(),
    // Reset time simulation to start of new morning
    currentPhase: "morning",
    dayElapsedMs: 0,
    updatedAt: new Date().toISOString(),
    stats: updatedStats,
  };

  // Record the completed day's XP in the report
  todayReport.xpEarned = xpEarned;

  return {
    dayReport: todayReport,
    xpEarned,
    levelsGained: xpResult.levelsGained,
    newLevel: xpResult.level,
    nextDayEvent: newEvent,
    updatedSave,
    completedMissions,
    setCompletions,
  };
}

// ── Helpers ──────────────────────────────────────────────────────────

/**
 * Create a fresh empty day report.
 */
export function createEmptyDayReport(
  day: number,
  activeEventIds: string[] = [],
): DayReport {
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
    activeEvents: activeEventIds,
  };
}

/**
 * Merge two productsSold records (additive).
 */
function mergeProductsSold(
  a: Record<string, number>,
  b: Record<string, number>,
): Record<string, number> {
  const result = { ...a };
  for (const [productId, qty] of Object.entries(b)) {
    result[productId] = (result[productId] ?? 0) + qty;
  }
  return result;
}

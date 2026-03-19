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
} from "@/types/game";
import { MAX_OFFLINE_HOURS } from "@/types/game";

import { simulateOfflinePeriod } from "./customers";
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
      },
      updatedSave: {
        ...save,
        lastPlayedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };
  }

  const activeEvents = getActiveEvents(save.activeEvents, save.currentDay);

  const simResult = simulateOfflinePeriod(
    hours,
    save.shelves,
    save.shopLevel,
    save.reputation,
    activeEvents,
    save.setHype,
    products,
    productSetMap,
  );

  const report: OfflineReport = {
    hoursElapsed: Math.round(hours * 10) / 10,
    revenue: simResult.revenue,
    productsSold: simResult.productsSold,
    totalItemsSold: simResult.totalItemsSold,
    customersServed: simResult.customersServed,
  };

  const updatedSave: SaveGame = {
    ...save,
    softCurrency: save.softCurrency + simResult.revenue,
    reputation: save.reputation + simResult.reputationGained,
    shelves: simResult.updatedShelves,
    lastPlayedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    stats: {
      ...save.stats,
      totalSales: save.stats.totalSales + simResult.totalItemsSold,
      totalRevenue: save.stats.totalRevenue + simResult.revenue,
      totalCustomersServed:
        save.stats.totalCustomersServed + simResult.customersServed,
    },
    // Update today report with offline sales
    todayReport: {
      ...save.todayReport,
      revenue: save.todayReport.revenue + simResult.revenue,
      customersVisited:
        save.todayReport.customersVisited + simResult.customersServed,
      customersPurchased:
        save.todayReport.customersPurchased + simResult.totalItemsSold,
      productsSold: mergeProductsSold(
        save.todayReport.productsSold,
        simResult.productsSold,
      ),
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
}

/**
 * Advance to the next day. This is the "End Day" action.
 *
 * Steps:
 * 1. Finalize today's report
 * 2. Calculate and apply XP
 * 3. Decay hype
 * 4. Clean up expired events
 * 5. Maybe schedule a new event
 * 6. Reset daily tracking
 * 7. Advance day counter
 */
export function advanceDay(
  save: SaveGame,
  products: Map<string, ProductDefinition>,
): EndDayResult {
  const currentDay = save.currentDay;
  const nextDay = currentDay + 1;

  // 1. Finalize today's report with profit calculation
  const todayReport: DayReport = {
    ...save.todayReport,
    profit: save.todayReport.revenue - save.todayReport.costOfGoodsSold,
  };

  // 2. Calculate XP
  const activeEvents = getActiveEvents(save.activeEvents, currentDay);
  const eventMods = getCombinedEventModifiers(activeEvents);

  const xpEarned = calculateDayXP(
    todayReport.customersPurchased,
    todayReport.packsOpened,
    todayReport.newCardsDiscovered,
    todayReport.revenue,
    eventMods.xpMultiplier,
  );

  const xpResult = applyXP(
    save.xp,
    save.shopLevel,
    save.xpToNextLevel,
    xpEarned,
  );

  // 3. Decay hype
  let updatedHype = decayHype(save.setHype);

  // 4. Clean up expired events
  const { activeEvents: remainingEvents, expiredIds } = cleanupExpiredEvents(
    save.activeEvents,
    nextDay,
  );
  const updatedPastIds = [...save.pastEventIds, ...expiredIds];

  // 5. Apply event hype boosts for remaining active events
  const nextDayActive = getActiveEvents(remainingEvents, nextDay);
  updatedHype = applyEventHype(updatedHype, nextDayActive);

  // 6. Maybe schedule a new event
  let newEvent: GameEvent | null = null;
  const lastEventDay =
    remainingEvents.length > 0
      ? Math.max(...remainingEvents.map((e) => e.startDay))
      : 0;

  if (shouldScheduleEvent(nextDay, lastEventDay, xpResult.level)) {
    const recentTypes = getRecentEventTypes(remainingEvents);
    newEvent = rollNewEvent(
      nextDay,
      xpResult.level,
      updatedPastIds,
      recentTypes,
    );
  }

  const allEvents = newEvent ? [...remainingEvents, newEvent] : remainingEvents;

  // 7. Build the next day's fresh report
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
    activeEvents: getActiveEvents(allEvents, nextDay).map((e) => e.id),
  };

  // 8. Build updated save
  const updatedSave: SaveGame = {
    ...save,
    currentDay: nextDay,
    shopLevel: xpResult.level,
    xp: xpResult.xp,
    xpToNextLevel: xpResult.xpToNextLevel,
    setHype: updatedHype,
    activeEvents: allEvents,
    pastEventIds: updatedPastIds,
    todayReport: freshReport,
    lastPlayedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    // Update today's report XP for the record
    stats: {
      ...save.stats,
    },
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

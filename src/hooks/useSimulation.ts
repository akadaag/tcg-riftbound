"use client";

/**
 * useSimulation — React hook that drives the real-time shop simulation.
 *
 * - Fires a tick every TICK_INTERVAL_MS (1 second) while the app is focused.
 * - On each tick: calls processTick (pure engine function) and dispatches
 *   results to the Zustand game store.
 * - On night→morning transition: calls advanceDay and dispatches the new save.
 * - Pauses automatically when the browser tab is hidden.
 *
 * Architecture: this hook is the ONLY place that runs the simulation loop.
 * All engine logic remains in pure functions (simulation.ts, day-cycle.ts).
 */

import { useEffect, useCallback } from "react";
import { useGameStore } from "@/stores/game-store";
import { processTick } from "@/features/engine/simulation";
import { advanceDay } from "@/features/engine/day-cycle";
import {
  getProductMap,
  getProductSetMap,
  getGameplayMeta,
  getCardById,
  getAllSets,
} from "@/features/catalog";
import {
  getUpgradeModifiers,
  calculateDisplayCaseBonus,
} from "@/features/upgrades";
import { getActiveEvents } from "@/features/engine/events";
import { getAreaEffects } from "@/features/engine/areas";
import { getStaffEffects } from "@/features/engine/staff";
import { getReputationTierBonuses } from "@/features/engine/reputation";
import {
  getCombinedTrendModifiers,
  generateDailyTrends,
} from "@/features/engine/market-trends";
import {
  getPrestigeTrafficBonus,
  getPrestigeIncomeMultiplier,
} from "@/features/engine/prestige";
import { TICK_INTERVAL_MS } from "@/types/game";

export function useSimulation() {
  const { applyTickResult, applyDayTransition, addNotification, patchSave } =
    useGameStore();

  const tick = useCallback(() => {
    // P3-06: Read directly from the store to avoid saveRef staleness (one-render lag)
    const currentSave = useGameStore.getState().save;

    // P3-05: Hydration guard — don't tick before save is loaded
    if (!currentSave?.lastTickAt && !currentSave?.currentPhase) return;

    // B1: Lazily generate market trends if missing or stale
    if ((currentSave.dailyMarketTrendDay ?? 0) !== currentSave.currentDay) {
      const sets = getAllSets();
      const setNames: Record<string, string> = {};
      for (const s of sets) {
        setNames[s.setCode] = s.setName;
      }
      const trends = generateDailyTrends(
        currentSave.currentDay,
        currentSave.shopLevel,
        currentSave.setHype.map((h) => h.setCode),
        setNames,
      );
      patchSave({
        dailyMarketTrends: trends,
        dailyMarketTrendDay: currentSave.currentDay,
      });
      // Don't run a tick this frame — let the store update first
      return;
    }

    // Don't run during night — the dashboard shows the summary
    if (currentSave.currentPhase === "night") return;

    const productMap = getProductMap();
    const productSetMapData = getProductSetMap();

    const upgradeMods = getUpgradeModifiers(currentSave.upgrades);
    const dcBonus = calculateDisplayCaseBonus(
      currentSave.displayCase,
      getGameplayMeta,
    );
    const areaEffects = getAreaEffects(currentSave.shopAreas);
    const staffEffects = getStaffEffects(currentSave.staff ?? []);
    const repTierBonuses = getReputationTierBonuses(currentSave.reputation);

    const activeEvents = getActiveEvents(
      currentSave.activeEvents,
      currentSave.currentDay,
    );

    // B1: Compute combined trend modifiers for the current day
    const trendMods = getCombinedTrendModifiers(
      currentSave.dailyMarketTrends ?? [],
    );

    // C1: Prestige traffic bonus
    const prestigeTrafficBonus = getPrestigeTrafficBonus(
      currentSave.prestigeCount ?? 0,
    );

    const result = processTick(
      Date.now(),
      currentSave.dayElapsedMs,
      currentSave.currentPhase,
      currentSave.shelves,
      productMap,
      currentSave.setHype,
      currentSave.shopLevel,
      currentSave.reputation,
      activeEvents,
      productSetMapData,
      upgradeMods.trafficBonus +
        areaEffects.trafficBonus +
        staffEffects.trafficBonus +
        repTierBonuses.trafficBonus +
        trendMods.trafficFlat +
        prestigeTrafficBonus,
      dcBonus.trafficBonus,
      upgradeMods.toleranceBonus +
        areaEffects.toleranceBonus +
        staffEffects.toleranceBonus +
        repTierBonuses.toleranceBonus,
      areaEffects.competitiveCustomerBonus +
        staffEffects.competitiveCustomerBonus,
      areaEffects.whaleCustomerBonus,
      trendMods.toleranceMult,
      trendMods.budgetMult,
      trendMods.customerTypeBonus,
    );

    // Night→Morning: advance the day
    if (result.newDayTriggered) {
      const dayResult = advanceDay(
        {
          ...currentSave,
          dayElapsedMs: result.newDayElapsedMs,
          currentPhase: result.newPhase,
        },
        productMap,
        getGameplayMeta,
        getCardById,
        getGameplayMeta,
        productSetMapData,
        getAllSets(),
      );
      applyDayTransition(dayResult);
      return;
    }

    // Phase changed → just announce
    if (result.phaseChanged && result.newPhase === "night") {
      addNotification({
        id: `phase-${Date.now()}`,
        message: "Shop closed for the night. Check your daily summary.",
        at: result.newLastTickAt,
        type: "info",
      });
    }

    // C1: Prestige income multiplier for tick revenue
    const prestigeIncomeMult = getPrestigeIncomeMultiplier(
      currentSave.prestigeCount ?? 0,
    );

    // Dispatch tick result
    applyTickResult({
      dayElapsedMs: result.newDayElapsedMs,
      lastTickAt: result.newLastTickAt,
      currentPhase: result.newPhase,
      revenue: Math.floor(
        (result.customerVisit?.revenue ?? 0) * prestigeIncomeMult,
      ),
      costOfGoods: 0, // shelved items have no per-sale COGS tracked here
      productId: result.customerVisit?.productId ?? null,
      quantity: result.customerVisit?.quantity ?? 0,
      customerVisited: result.customerVisit !== null,
      customerPurchased: result.customerVisit?.purchased ?? false,
      updatedShelves: result.updatedShelves,
      notification: result.notification,
      reputationPenalty: result.reputationPenalty,
      satisfaction: result.customerVisit?.satisfaction ?? 0,
      customerVisit: result.customerVisit ?? null,
    });

    // B2: Dispatch extra notifications (shelf empty, low stock)
    for (const extra of result.extraNotifications) {
      addNotification(extra);
    }
  }, [applyTickResult, applyDayTransition, addNotification, patchSave]);

  // Start the tick interval; pause when tab hidden
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;

    function start() {
      if (intervalId) return;
      intervalId = setInterval(tick, TICK_INTERVAL_MS);
    }

    function stop() {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    }

    function handleVisibilityChange() {
      if (document.hidden) {
        stop();
      } else {
        start();
      }
    }

    start();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [tick]);
}

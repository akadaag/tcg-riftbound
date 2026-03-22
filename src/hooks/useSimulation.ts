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
import { TICK_INTERVAL_MS } from "@/types/game";

export function useSimulation() {
  const { applyTickResult, applyDayTransition, addNotification } =
    useGameStore();

  const tick = useCallback(() => {
    // P3-06: Read directly from the store to avoid saveRef staleness (one-render lag)
    const currentSave = useGameStore.getState().save;

    // P3-05: Hydration guard — don't tick before save is loaded
    if (!currentSave?.lastTickAt && !currentSave?.currentPhase) return;

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
        repTierBonuses.trafficBonus,
      dcBonus.trafficBonus,
      upgradeMods.toleranceBonus +
        areaEffects.toleranceBonus +
        staffEffects.toleranceBonus +
        repTierBonuses.toleranceBonus,
      areaEffects.competitiveCustomerBonus +
        staffEffects.competitiveCustomerBonus,
      areaEffects.whaleCustomerBonus,
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

    // Dispatch tick result
    applyTickResult({
      dayElapsedMs: result.newDayElapsedMs,
      lastTickAt: result.newLastTickAt,
      currentPhase: result.newPhase,
      revenue: result.customerVisit?.revenue ?? 0,
      costOfGoods: 0, // shelved items have no per-sale COGS tracked here
      productId: result.customerVisit?.productId ?? null,
      quantity: result.customerVisit?.quantity ?? 0,
      customerVisited: result.customerVisit !== null,
      customerPurchased: result.customerVisit?.purchased ?? false,
      updatedShelves: result.updatedShelves,
      notification: result.notification,
      reputationPenalty: result.reputationPenalty,
    });
  }, [applyTickResult, applyDayTransition, addNotification]);

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

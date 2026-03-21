"use client";

import { useMemo } from "react";
import { m } from "framer-motion";
import { useGameStore } from "@/stores/game-store";
import { useAuth } from "@/features/auth/auth-provider";
import { SyncIndicator } from "@/components/ui/sync-indicator";
import { getActiveEvents } from "@/features/engine/events";
import {
  getProductMap,
  getGameplayMeta,
  getCardById,
} from "@/features/catalog";
import {
  calculateDisplayCaseBonus,
  getDisplayCaseCapacity,
} from "@/features/upgrades";
import {
  getDayProgress,
  getPhaseAtElapsed,
} from "@/features/engine/simulation";
import { useSimulation } from "@/hooks/useSimulation";
import { EndDayModal } from "@/components/ui/end-day-modal";
import {
  generateDailyMissions,
  generateWeeklyMissions,
  getMilestoneMissions,
} from "@/features/missions";
import {
  getReputationTier,
  getNextTierThreshold,
} from "@/features/engine/reputation";
import Link from "next/link";
import type { DayPhase, ShopNotification } from "@/types/game";

// Phase display config
const PHASE_LABELS: Record<DayPhase, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  night: "Night — Shop Closed",
};

const PHASE_COLORS: Record<DayPhase, string> = {
  morning: "text-yellow-300",
  afternoon: "text-orange-300",
  evening: "text-purple-300",
  night: "text-blue-300",
};

export default function HomePage() {
  // Drive the simulation
  useSimulation();

  const {
    save,
    offlineReport,
    setOfflineReport,
    notifications,
    endDayResult,
    clearEndDayResult,
  } = useGameStore();
  const { displayName } = useAuth();

  const greeting = displayName
    ? `Welcome back, ${displayName}.`
    : "Welcome back, shopkeeper.";

  const activeEvents = getActiveEvents(save.activeEvents, save.currentDay);

  const xpPct =
    save.xpToNextLevel > 0
      ? Math.round((save.xp / save.xpToNextLevel) * 100)
      : 100;

  const totalInventory = save.inventory.reduce(
    (acc, i) => acc + i.ownedQuantity,
    0,
  );

  const totalShelved = save.shelves.reduce((acc, s) => acc + s.quantity, 0);

  // Display case info
  const displayCaseBonus = useMemo(
    () => calculateDisplayCaseBonus(save.displayCase, getGameplayMeta),
    [save.displayCase],
  );
  const displayCaseCapacity = getDisplayCaseCapacity(save.upgrades);

  // Day progress
  const dayProgress = getDayProgress(save.dayElapsedMs);
  const { phase: currentPhase, phaseProgressPct } = getPhaseAtElapsed(
    save.dayElapsedMs,
  );

  const isNight = currentPhase === "night";

  // Shelf stock gauges — compute max per shelf (rough max = 24)
  const productMap = getProductMap();

  // Resolve completed mission names for the modal
  const completedMissionNames = useMemo(() => {
    if (!endDayResult?.completedMissions?.length) return [];
    // P2-19: Use pre-transition shop level — missions were generated before XP was applied
    const preLevelUpLevel = endDayResult.newLevel - endDayResult.levelsGained;
    const allDefs = [
      ...generateDailyMissions(preLevelUpLevel, endDayResult.dayReport.day),
      ...generateWeeklyMissions(preLevelUpLevel, endDayResult.dayReport.day),
      ...getMilestoneMissions(),
    ];
    return endDayResult.completedMissions
      .map((id: string) => {
        const def = allDefs.find((d) => d.id === id);
        return def?.title ?? id;
      })
      .filter(Boolean);
  }, [endDayResult]);

  return (
    <>
      <div className="flex flex-1 flex-col px-4 pt-6 pb-4">
        {/* Offline Report Banner */}
        {offlineReport && (
          <div className="border-accent-primary/30 bg-accent-primary/5 mb-4 rounded-xl border p-4">
            <h3 className="text-accent-primary mb-2 font-semibold">
              While You Were Away
            </h3>
            <p className="text-foreground-secondary mb-3 text-sm">
              {offlineReport.hoursElapsed.toFixed(1)} hours elapsed
              {offlineReport.daysSimulated > 0 &&
                ` — ${offlineReport.daysSimulated} day${offlineReport.daysSimulated > 1 ? "s" : ""} simulated`}
            </p>
            <div className="mb-3 grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-foreground-muted">Revenue</span>
                <p className="text-currency-gold font-bold">
                  {offlineReport.revenue.toLocaleString()} G
                </p>
              </div>
              <div>
                <span className="text-foreground-muted">Items Sold</span>
                <p className="font-bold">{offlineReport.totalItemsSold}</p>
              </div>
              <div>
                <span className="text-foreground-muted">Customers</span>
                <p className="font-bold">{offlineReport.customersServed}</p>
              </div>
              {(offlineReport.singlesRevenue ?? 0) > 0 && (
                <div>
                  <span className="text-foreground-muted">Singles Revenue</span>
                  <p className="text-currency-gold font-bold">
                    {offlineReport.singlesRevenue.toLocaleString()} G
                  </p>
                </div>
              )}
              {(offlineReport.passiveIncome ?? 0) > 0 && (
                <div>
                  <span className="text-foreground-muted">Passive Income</span>
                  <p className="font-bold text-blue-400">
                    +{offlineReport.passiveIncome.toLocaleString()} G
                  </p>
                </div>
              )}
              {(offlineReport.reputationGained ?? 0) > 0 && (
                <div>
                  <span className="text-foreground-muted">Reputation</span>
                  <p className="font-bold text-purple-400">
                    +{offlineReport.reputationGained}
                  </p>
                </div>
              )}
            </div>
            <button
              onClick={() => setOfflineReport(null)}
              className="bg-accent-primary hover:bg-accent-primary-hover w-full rounded-lg py-2 text-sm font-medium text-white transition-colors"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Header */}
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Riftbound Shop</h1>
            <SyncIndicator />
          </div>
          <p className="text-foreground-secondary mt-1 text-sm">
            Day {save.currentDay} — {greeting}
          </p>

          {/* XP Bar */}
          <div className="mt-3">
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-accent-primary font-medium">
                Lv. {save.shopLevel}
              </span>
              <span className="text-foreground-muted">
                {save.xp}/{save.xpToNextLevel} XP
              </span>
            </div>
            <div className="bg-card-border h-2 overflow-hidden rounded-full">
              <div
                className="bg-xp-bar h-full rounded-full transition-all duration-500"
                style={{ width: `${xpPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Day Phase Indicator */}
        <section className="mb-4">
          <div className="border-card-border bg-card-background rounded-xl border p-3">
            <div className="mb-2 flex items-center justify-between">
              <span
                className={`text-sm font-semibold ${PHASE_COLORS[currentPhase]}`}
              >
                {PHASE_LABELS[currentPhase]}
              </span>
              <span className="text-foreground-muted text-xs">
                Day {Math.round(dayProgress * 100)}% complete
              </span>
            </div>

            {/* Day progress bar */}
            <div className="bg-card-border h-1.5 overflow-hidden rounded-full">
              <div
                className="h-full rounded-full bg-yellow-500/70 transition-all duration-1000"
                style={{ width: `${Math.round(dayProgress * 100)}%` }}
              />
            </div>

            {/* Phase dots */}
            <div className="mt-2 flex justify-between text-xs">
              {(["morning", "afternoon", "evening", "night"] as DayPhase[]).map(
                (p) => (
                  <span
                    key={p}
                    className={
                      currentPhase === p
                        ? PHASE_COLORS[p]
                        : "text-foreground-muted"
                    }
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1, 4)}
                  </span>
                ),
              )}
            </div>
          </div>
        </section>

        {/* Night — daily summary */}
        {isNight && (
          <section className="mb-4">
            <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4">
              <h2 className="mb-2 text-sm font-semibold text-blue-300">
                Day {save.currentDay} Summary
              </h2>
              <div className="grid grid-cols-2 gap-y-2 text-sm">
                <span className="text-foreground-secondary">Revenue</span>
                <span className="text-currency-gold text-right font-medium">
                  {save.todayReport.revenue.toLocaleString()} G
                </span>
                <span className="text-foreground-secondary">Customers</span>
                <span className="text-right font-medium">
                  {save.todayReport.customersPurchased}/
                  {save.todayReport.customersVisited}
                </span>
                <span className="text-foreground-secondary">Packs Opened</span>
                <span className="text-right font-medium">
                  {save.todayReport.packsOpened}
                </span>
                <span className="text-foreground-secondary">New Cards</span>
                <span className="text-right font-medium text-green-400">
                  {save.todayReport.newCardsDiscovered}
                </span>
              </div>
              <p className="text-foreground-muted mt-3 text-center text-xs">
                Morning begins soon — use this time to restock and plan.
              </p>
            </div>
          </section>
        )}

        {/* Active Events */}
        {activeEvents.length > 0 && (
          <div className="mb-4 space-y-2">
            {activeEvents.map((event) => {
              const daysLeft =
                event.startDay + event.duration - save.currentDay;
              return (
                <div
                  key={event.id}
                  className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-yellow-300">
                      {event.name}
                    </p>
                    <span className="text-xs text-yellow-400/70">
                      {daysLeft}d left
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Quick Stats */}
        <div className="mb-4 grid grid-cols-2 gap-3">
          <StatCard
            label="Balance"
            value={`${save.softCurrency.toLocaleString()} G`}
            accent
          />
          <StatCard label="Shop Level" value={`Lv. ${save.shopLevel}`} />
          <StatCard
            label="Today's Revenue"
            value={`${save.todayReport.revenue.toLocaleString()} G`}
          />
          <StatCard
            label={`Rep — ${getReputationTier(save.reputation).name}`}
            value={save.reputation.toLocaleString()}
          />
        </div>

        {/* Shelf Stock Gauges */}
        {save.shelves.some((s) => s.productId) && (
          <section className="mb-4">
            <h2 className="mb-2 text-sm font-semibold">Shelf Stock</h2>
            <div className="border-card-border bg-card-background space-y-2 rounded-xl border p-3">
              {save.shelves.map((shelf, i) => {
                if (!shelf.productId) return null;
                const product = productMap.get(shelf.productId);
                const name = product?.name ?? shelf.productId;
                const maxQty = 24;
                const pct = Math.min(100, (shelf.quantity / maxQty) * 100);
                const color =
                  pct > 50
                    ? "bg-green-500"
                    : pct > 20
                      ? "bg-yellow-500"
                      : "bg-red-500";
                return (
                  <div key={i}>
                    <div className="mb-0.5 flex items-center justify-between text-xs">
                      <span className="text-foreground-secondary max-w-[70%] truncate">
                        {name}
                      </span>
                      <span className="text-foreground-muted">
                        {shelf.quantity}
                      </span>
                    </div>
                    <div className="bg-card-border h-1 overflow-hidden rounded-full">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${color}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Live Notification Feed */}
        {notifications.length > 0 && (
          <section className="mb-4">
            <h2 className="mb-2 text-sm font-semibold">Live Feed</h2>
            <div className="border-card-border bg-card-background max-h-40 space-y-1 overflow-y-auto rounded-xl border p-3">
              {notifications.slice(0, 20).map((n) => (
                <NotificationRow key={n.id} notification={n} />
              ))}
            </div>
          </section>
        )}

        {/* Display Case Summary */}
        {save.displayCase.length > 0 && (
          <DisplayCaseSummary
            cardIds={save.displayCase}
            capacity={displayCaseCapacity}
            trafficBonus={displayCaseBonus.trafficBonus}
            totalScore={displayCaseBonus.totalDisplayScore}
          />
        )}

        {/* Today's Progress (when not night) */}
        {!isNight && (
          <section className="mb-4">
            <h2 className="mb-3 text-lg font-semibold">Today</h2>
            <div className="border-card-border bg-card-background rounded-xl border p-4">
              <div className="grid grid-cols-2 gap-y-2 text-sm">
                <span className="text-foreground-secondary">Revenue</span>
                <span className="text-currency-gold text-right font-medium">
                  {save.todayReport.revenue.toLocaleString()} G
                </span>
                <span className="text-foreground-secondary">Customers</span>
                <span className="text-right font-medium">
                  {save.todayReport.customersPurchased}/
                  {save.todayReport.customersVisited}
                </span>
                <span className="text-foreground-secondary">Packs Opened</span>
                <span className="text-right font-medium">
                  {save.todayReport.packsOpened}
                </span>
                <span className="text-foreground-secondary">New Cards</span>
                <span className="text-right font-medium text-green-400">
                  {save.todayReport.newCardsDiscovered}
                </span>
              </div>
            </div>
          </section>
        )}

        {/* Quick Actions */}
        <section className="mb-6">
          <h2 className="mb-3 text-lg font-semibold">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <ActionButton label="Buy Stock" href="/shop/supplier" />
            <ActionButton
              label={`Open Packs${totalInventory > 0 ? ` (${totalInventory})` : ""}`}
              href="/packs"
            />
            <ActionButton
              label={`My Shop${totalShelved > 0 ? ` (${totalShelved} items)` : ""}`}
              href="/shop"
            />
            <ActionButton label="Collection" href="/collection" />
          </div>
        </section>
      </div>

      {/* End of Day Summary Modal */}
      <EndDayModal
        isOpen={endDayResult !== null}
        dayReport={
          endDayResult?.dayReport ?? {
            day: 0,
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
          }
        }
        xpEarned={endDayResult?.xpEarned ?? 0}
        levelsGained={endDayResult?.levelsGained ?? 0}
        newLevel={endDayResult?.newLevel ?? save.shopLevel}
        nextDayEvent={endDayResult?.nextDayEvent ?? null}
        completedMissions={completedMissionNames}
        setCompletions={endDayResult?.setCompletions}
        singlesRevenue={endDayResult?.singlesRevenue}
        reputationChange={endDayResult?.reputationChange}
        staffPayroll={endDayResult?.staffPayroll}
        passiveIncome={endDayResult?.passiveIncome}
        reputationTierName={endDayResult?.reputationTierName}
        avgDayRevenue={endDayResult?.avgDayRevenue}
        onClose={clearEndDayResult}
      />
    </>
  );
}

// ── Notification Row ──────────────────────────────

function NotificationRow({ notification }: { notification: ShopNotification }) {
  const color =
    notification.type === "sale"
      ? "text-green-400"
      : notification.type === "event"
        ? "text-yellow-300"
        : "text-foreground-secondary";

  const time = new Date(notification.at).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div className="flex items-start justify-between gap-2 text-xs">
      <span className={`${color} flex-1`}>{notification.message}</span>
      <span className="text-foreground-muted shrink-0">{time}</span>
    </div>
  );
}

// ── Display Case Summary ────────────────────────────

function DisplayCaseSummary({
  cardIds,
  capacity,
  trafficBonus,
  totalScore,
}: {
  cardIds: string[];
  capacity: number;
  trafficBonus: number;
  totalScore: number;
}) {
  const cardNames = cardIds
    .map((id) => {
      const card = getCardById(id);
      return card?.name ?? "Unknown";
    })
    .slice(0, 5);

  return (
    <section className="mb-4">
      <h2 className="mb-3 text-lg font-semibold">Display Case</h2>
      <div className="border-rarity-showcase/30 bg-rarity-showcase/5 rounded-xl border p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-rarity-showcase text-sm font-medium">
            {cardIds.length}/{capacity} cards showcased
          </span>
          {trafficBonus > 0 && (
            <span className="text-xs text-green-400">
              +{trafficBonus} traffic
            </span>
          )}
        </div>

        <div className="space-y-1">
          {cardNames.map((name, i) => (
            <p key={i} className="text-foreground-secondary truncate text-xs">
              {name}
            </p>
          ))}
          {cardIds.length > 5 && (
            <p className="text-foreground-muted text-xs">
              +{cardIds.length - 5} more
            </p>
          )}
        </div>

        <Link
          href="/collection"
          className="text-rarity-showcase mt-3 block text-center text-xs font-medium"
        >
          Manage Display Case
        </Link>
      </div>
    </section>
  );
}

// ── Helper components ───────────────────────────────

function StatCard({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <m.div
      className="border-card-border bg-card-background rounded-xl border p-3"
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
    >
      <p className="text-foreground-muted text-xs">{label}</p>
      <p
        className={`mt-1 text-lg font-bold ${accent ? "text-accent-primary" : "text-foreground"}`}
      >
        {value}
      </p>
    </m.div>
  );
}

function ActionButton({ label, href }: { label: string; href: string }) {
  return (
    <m.div whileTap={{ scale: 0.96 }}>
      <Link
        href={href}
        className="border-card-border bg-card-background text-foreground hover:bg-card-hover active:bg-card-hover flex min-h-[44px] items-center justify-center rounded-xl border px-4 py-3 text-sm font-medium transition-colors"
      >
        {label}
      </Link>
    </m.div>
  );
}

"use client";

import { useState, useMemo } from "react";
import { useGameStore } from "@/stores/game-store";
import { useAuth } from "@/features/auth/auth-provider";
import { SyncIndicator } from "@/components/ui/sync-indicator";
import { EndDayModal } from "@/components/ui/end-day-modal";
import { getActiveEvents } from "@/features/engine/events";
import { advanceDay, type EndDayResult } from "@/features/engine/day-cycle";
import {
  getProductMap,
  getGameplayMeta,
  getCardById,
} from "@/features/catalog";
import {
  calculateDisplayCaseBonus,
  getDisplayCaseCapacity,
} from "@/features/upgrades";
import { XP_THRESHOLDS } from "@/types/game";
import Link from "next/link";

export default function HomePage() {
  const { save, offlineReport, setOfflineReport, applySave } = useGameStore();
  const { displayName } = useAuth();
  const [endDayResult, setEndDayResult] = useState<EndDayResult | null>(null);

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

  function handleEndDay() {
    const productMap = getProductMap();
    const result = advanceDay(save, productMap, getGameplayMeta);
    setEndDayResult(result);
    // Don't apply save yet — wait for modal dismiss
  }

  function handleEndDayClose() {
    if (endDayResult) {
      applySave(endDayResult.updatedSave);
      setEndDayResult(null);
    }
  }

  return (
    <div className="flex flex-1 flex-col px-4 pt-6 pb-4">
      {/* Offline Report Modal */}
      {offlineReport && (
        <div className="border-accent-primary/30 bg-accent-primary/5 mb-4 rounded-xl border p-4">
          <h3 className="text-accent-primary mb-2 font-semibold">
            While You Were Away
          </h3>
          <p className="text-foreground-secondary mb-3 text-sm">
            {offlineReport.hoursElapsed.toFixed(1)} hours elapsed
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
      <div className="mb-6">
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

      {/* Active Events */}
      {activeEvents.length > 0 && (
        <div className="mb-4 space-y-2">
          {activeEvents.map((event) => {
            const daysLeft = event.startDay + event.duration - save.currentDay;
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
      <div className="mb-6 grid grid-cols-2 gap-3">
        <StatCard
          label="Balance"
          value={`${save.softCurrency.toLocaleString()} G`}
          accent
        />
        <StatCard label="Shop Level" value={`Lv. ${save.shopLevel}`} />
        <StatCard
          label="Cards Collected"
          value={`${save.stats.uniqueCardsOwned}`}
        />
        <StatCard label="Reputation" value={save.reputation.toLocaleString()} />
      </div>

      {/* Display Case Summary */}
      {save.displayCase.length > 0 && (
        <DisplayCaseSummary
          cardIds={save.displayCase}
          capacity={displayCaseCapacity}
          trafficBonus={displayCaseBonus.trafficBonus}
          totalScore={displayCaseBonus.totalDisplayScore}
        />
      )}

      {/* Today's Progress */}
      <section className="mb-6">
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

      {/* End Day Button */}
      <section className="mb-6">
        <button
          onClick={handleEndDay}
          className="w-full rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-4 text-sm font-medium text-yellow-300 transition-colors hover:bg-yellow-500/20 active:bg-yellow-500/30"
        >
          End Day {save.currentDay}
        </button>
      </section>

      {/* End Day Modal */}
      {endDayResult && (
        <EndDayModal
          isOpen={true}
          dayReport={endDayResult.dayReport}
          xpEarned={endDayResult.xpEarned}
          levelsGained={endDayResult.levelsGained}
          newLevel={endDayResult.newLevel}
          nextDayEvent={endDayResult.nextDayEvent}
          completedMissions={endDayResult.completedMissions}
          onClose={handleEndDayClose}
        />
      )}
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
  // Get card names for display
  const cardNames = cardIds
    .map((id) => {
      const card = getCardById(id);
      return card?.name ?? "Unknown";
    })
    .slice(0, 5); // Show first 5

  return (
    <section className="mb-6">
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

        {/* Card names */}
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

        {/* Link to collection */}
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
    <div className="border-card-border bg-card-background rounded-xl border p-3">
      <p className="text-foreground-muted text-xs">{label}</p>
      <p
        className={`mt-1 text-lg font-bold ${accent ? "text-accent-primary" : "text-foreground"}`}
      >
        {value}
      </p>
    </div>
  );
}

function ActionButton({ label, href }: { label: string; href: string }) {
  return (
    <Link
      href={href}
      className="border-card-border bg-card-background text-foreground hover:bg-card-hover active:bg-card-hover flex items-center justify-center rounded-xl border px-4 py-3 text-sm font-medium transition-colors"
    >
      {label}
    </Link>
  );
}

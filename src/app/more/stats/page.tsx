"use client";

import { useGameStore } from "@/stores/game-store";
import { getAllSets, getAllCards } from "@/features/catalog";
import { useMemo } from "react";
import { m } from "framer-motion";
import { fadeSlideUp, staggerContainer, staggerItem } from "@/lib/animations";

export default function StatsPage() {
  const { save } = useGameStore();
  const stats = save.stats;
  const sets = getAllSets();
  const allCards = getAllCards();

  // Computed stats
  const totalPossibleCards = useMemo(
    () => sets.reduce((acc, s) => acc + s.totalCardCount, 0),
    [sets],
  );

  const completionPct = useMemo(
    () =>
      totalPossibleCards > 0
        ? Math.round((stats.uniqueCardsOwned / totalPossibleCards) * 100)
        : 0,
    [stats.uniqueCardsOwned, totalPossibleCards],
  );

  // P4-12: Use totalDaysPlayed from stats instead of currentDay - 1
  const avgRevenuePerDay = useMemo(
    () =>
      stats.totalDaysPlayed > 0
        ? Math.round(stats.totalRevenue / stats.totalDaysPlayed)
        : 0,
    [stats.totalRevenue, stats.totalDaysPlayed],
  );

  const conversionRate = useMemo(
    () =>
      stats.totalCustomersServed > 0
        ? Math.round((stats.totalSales / stats.totalCustomersServed) * 100)
        : 0,
    [stats.totalSales, stats.totalCustomersServed],
  );

  // Per-set owned count
  const perSetStats = useMemo(() => {
    const ownedSet = new Set(save.collection.map((c) => c.cardId));
    return sets.map((set) => {
      const setCards = allCards.filter((c) => c.setCode === set.setCode);
      const owned = setCards.filter((c) => ownedSet.has(c.id)).length;
      const pct =
        set.totalCardCount > 0
          ? Math.round((owned / set.totalCardCount) * 100)
          : 0;
      return {
        setCode: set.setCode,
        setName: set.setName,
        owned,
        total: set.totalCardCount,
        pct,
      };
    });
  }, [sets, allCards, save.collection]);

  return (
    <m.div
      className="flex flex-1 flex-col px-4 pt-6 pb-4"
      variants={fadeSlideUp}
      initial="initial"
      animate="animate"
    >
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Statistics</h1>
        <p className="text-foreground-secondary mt-1 text-sm">
          Day {save.currentDay} — Shop Level {save.shopLevel}
        </p>
      </div>

      {/* Overview Cards */}
      <m.div
        className="mb-6 grid grid-cols-2 gap-3"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <StatCard
          label="Total Revenue"
          value={`${stats.totalRevenue.toLocaleString()} G`}
          accent
        />
        <StatCard
          label="Avg Rev/Day"
          value={`${avgRevenuePerDay.toLocaleString()} G`}
        />
        <StatCard
          label="Items Sold"
          value={stats.totalSales.toLocaleString()}
        />
        <StatCard
          label="Customers Served"
          value={stats.totalCustomersServed.toLocaleString()}
        />
      </m.div>

      {/* Sales Breakdown */}
      <Section title="Sales">
        <div className="border-card-border bg-card-background rounded-xl border p-4">
          <div className="grid grid-cols-2 gap-y-3 text-sm">
            <Row
              label="Total Items Sold"
              value={stats.totalSales.toLocaleString()}
            />
            <Row
              label="Total Revenue"
              value={`${stats.totalRevenue.toLocaleString()} G`}
              color="text-currency-gold"
            />
            <Row
              label="Singles Sold"
              value={stats.totalSinglesSold.toLocaleString()}
            />
            <Row
              label="Singles Revenue"
              value={`${stats.totalSinglesRevenue.toLocaleString()} G`}
              color="text-currency-gold"
            />
            <Row label="Conversion Rate" value={`${conversionRate}%`} />
            <Row
              label="Trades Completed"
              value={stats.totalTradesCompleted.toLocaleString()}
            />
          </div>
        </div>
      </Section>

      {/* Collection Stats */}
      <Section title="Collection">
        <div className="border-card-border bg-card-background rounded-xl border p-4">
          <div className="grid grid-cols-2 gap-y-3 text-sm">
            <Row
              label="Packs Opened"
              value={stats.totalPacksOpened.toLocaleString()}
            />
            <Row
              label="Cards Collected"
              value={stats.totalCardsCollected.toLocaleString()}
            />
            <Row
              label="Unique Cards"
              value={`${stats.uniqueCardsOwned} / ${totalPossibleCards}`}
            />
            <Row
              label="Completion"
              value={`${completionPct}%`}
              color="text-accent-primary"
            />
          </div>

          {/* Completion bar */}
          <div className="mt-4">
            <div className="bg-card-border h-2 w-full overflow-hidden rounded-full">
              <div
                className="bg-accent-primary h-full rounded-full transition-all duration-500"
                style={{ width: `${completionPct}%` }}
              />
            </div>
          </div>
        </div>
      </Section>

      {/* Per-set progress */}
      <Section title="Set Progress">
        <div className="space-y-3">
          {perSetStats.map((s) => (
            <div
              key={s.setCode}
              className="border-card-border bg-card-background rounded-xl border p-3"
            >
              <div className="mb-1 flex items-center justify-between">
                <p className="text-sm font-medium">{s.setName}</p>
                <span className="text-accent-primary text-sm font-bold">
                  {s.pct}%
                </span>
              </div>
              <p className="text-foreground-muted mb-2 text-xs">
                {s.owned}/{s.total} cards
              </p>
              <div className="bg-card-border h-1.5 w-full overflow-hidden rounded-full">
                <div
                  className="bg-accent-primary h-full rounded-full transition-all duration-500"
                  style={{ width: `${s.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Shop Info */}
      <Section title="Shop">
        <div className="border-card-border bg-card-background rounded-xl border p-4">
          <div className="grid grid-cols-2 gap-y-3 text-sm">
            <Row label="Shop Level" value={save.shopLevel.toString()} />
            <Row label="Current Day" value={save.currentDay.toString()} />
            <Row
              label="Balance"
              value={`${save.softCurrency.toLocaleString()} G`}
              color="text-currency-gold"
            />
            <Row label="Reputation" value={save.reputation.toLocaleString()} />
            <Row
              label="XP"
              value={`${save.xp} / ${save.xpToNextLevel}`}
              color="text-accent-primary"
            />
            <Row
              label="Display Case"
              value={`${save.displayCase.length} cards`}
            />
          </div>
        </div>
      </Section>
    </m.div>
  );
}

// ── Helpers ──────────────────────────────────────────

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6">
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

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
      variants={staggerItem}
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

function Row({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <>
      <span className="text-foreground-secondary">{label}</span>
      <span className={`text-right font-medium ${color ?? "text-foreground"}`}>
        {value}
      </span>
    </>
  );
}

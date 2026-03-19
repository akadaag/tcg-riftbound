"use client";

import { useGameStore } from "@/stores/game-store";
import { useAuth } from "@/features/auth/auth-provider";
import { SyncIndicator } from "@/components/ui/sync-indicator";

export default function HomePage() {
  const { save } = useGameStore();
  const { displayName } = useAuth();

  const greeting = displayName
    ? `Welcome back, ${displayName}.`
    : "Welcome back, shopkeeper.";

  return (
    <div className="flex flex-1 flex-col px-4 pt-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Riftbound Shop</h1>
          <SyncIndicator />
        </div>
        <p className="text-foreground-secondary mt-1 text-sm">
          Day {save.currentDay} — {greeting}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3">
        <StatCard
          label="Balance"
          value={`${save.softCurrency.toLocaleString()} G`}
          accent
        />
        <StatCard label="Shop Level" value={`Lv. ${save.shopLevel}`} />
        <StatCard label="Reputation" value={save.reputation.toLocaleString()} />
        <StatCard
          label="Cards Collected"
          value={save.stats.uniqueCardsOwned.toLocaleString()}
        />
      </div>

      {/* Active Missions Placeholder */}
      <section className="mb-6">
        <h2 className="mb-3 text-lg font-semibold">Active Missions</h2>
        <div className="border-card-border bg-card-background rounded-xl border p-4">
          <p className="text-foreground-muted text-sm">
            No active missions yet. Complete your shop setup to unlock missions.
          </p>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="mb-6">
        <h2 className="mb-3 text-lg font-semibold">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3">
          <ActionButton label="Open Packs" href="/packs" />
          <ActionButton label="Restock" href="/shop" />
          <ActionButton label="View Collection" href="/collection" />
          <ActionButton label="Upgrades" href="/more" />
        </div>
      </section>
    </div>
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
    <a
      href={href}
      className="border-card-border bg-card-background text-foreground hover:bg-card-hover active:bg-card-hover flex items-center justify-center rounded-xl border px-4 py-3 text-sm font-medium transition-colors"
    >
      {label}
    </a>
  );
}

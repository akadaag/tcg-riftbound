"use client";

import { useGameStore } from "@/stores/game-store";
import { useToast } from "@/components/ui/toast";
import {
  getUpgradeCatalog,
  getUpgradesByCategory,
  getOwnedLevel,
  getUpgradeCost,
  canPurchaseUpgrade,
  getUpgradeModifiers,
  getDisplayCaseCapacity,
  type UpgradeModifiers,
} from "@/features/upgrades";
import type { UpgradeDefinition, UpgradeCategory } from "@/types/game";
import { useMemo } from "react";

const CATEGORY_LABELS: Record<UpgradeCategory, string> = {
  shelves: "Shelves",
  traffic: "Traffic",
  reputation: "Reputation",
  xp: "Experience",
  wholesale: "Wholesale",
  display_case: "Display Case",
  tolerance: "Pricing",
  storage: "Storage",
};

const CATEGORY_ORDER: UpgradeCategory[] = [
  "shelves",
  "traffic",
  "reputation",
  "wholesale",
  "tolerance",
  "display_case",
  "xp",
  "storage",
];

export default function UpgradesPage() {
  const { save, purchaseUpgrade } = useGameStore();
  const { toast } = useToast();

  const catalog = getUpgradeCatalog();
  const mods = useMemo(
    () => getUpgradeModifiers(save.upgrades),
    [save.upgrades],
  );

  // Group upgrades by category
  const groupedUpgrades = useMemo(() => {
    const groups: {
      category: UpgradeCategory;
      upgrades: UpgradeDefinition[];
    }[] = [];
    for (const cat of CATEGORY_ORDER) {
      const upgrades = getUpgradesByCategory(cat);
      if (upgrades.length > 0) {
        groups.push({ category: cat, upgrades });
      }
    }
    return groups;
  }, []);

  // Count total owned levels
  const totalLevels = save.upgrades.reduce((acc, u) => acc + u.levelOwned, 0);
  const maxLevels = catalog.reduce((acc, u) => acc + u.maxLevel, 0);

  function handlePurchase(upgradeId: string) {
    const result = purchaseUpgrade(upgradeId);
    if (result.success) {
      toast("Upgrade purchased!", "success");
    } else {
      toast(result.reason ?? "Cannot purchase", "error");
    }
  }

  return (
    <div className="flex flex-1 flex-col px-4 pt-6 pb-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Upgrades</h1>
        <p className="text-foreground-secondary mt-1 text-sm">
          Improve your shop capacity, reputation, and unlock new features.
        </p>
      </div>

      {/* Summary stats */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <div className="border-card-border bg-card-background rounded-xl border p-3 text-center">
          <p className="text-foreground-muted text-xs">Balance</p>
          <p className="text-currency-gold mt-1 text-lg font-bold">
            {save.softCurrency.toLocaleString()} G
          </p>
        </div>
        <div className="border-card-border bg-card-background rounded-xl border p-3 text-center">
          <p className="text-foreground-muted text-xs">Upgrades</p>
          <p className="mt-1 text-lg font-bold">
            {totalLevels}
            <span className="text-foreground-muted text-xs">/{maxLevels}</span>
          </p>
        </div>
        <div className="border-card-border bg-card-background rounded-xl border p-3 text-center">
          <p className="text-foreground-muted text-xs">Shop Level</p>
          <p className="text-accent-primary mt-1 text-lg font-bold">
            Lv. {save.shopLevel}
          </p>
        </div>
      </div>

      {/* Active bonuses summary */}
      <ActiveBonusSummary mods={mods} upgrades={save.upgrades} />

      {/* Upgrade cards grouped by category */}
      <div className="space-y-6">
        {groupedUpgrades.map(({ category, upgrades }) => (
          <section key={category}>
            <h2 className="text-foreground-secondary mb-3 text-sm font-semibold tracking-wide uppercase">
              {CATEGORY_LABELS[category]}
            </h2>
            <div className="space-y-3">
              {upgrades.map((upgrade) => (
                <UpgradeCard
                  key={upgrade.id}
                  upgrade={upgrade}
                  currentLevel={getOwnedLevel(upgrade.id, save.upgrades)}
                  shopLevel={save.shopLevel}
                  currency={save.softCurrency}
                  onPurchase={handlePurchase}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function ActiveBonusSummary({
  mods,
  upgrades,
}: {
  mods: UpgradeModifiers;
  upgrades: { upgradeId: string; levelOwned: number }[];
}) {
  const hasAnyUpgrade = upgrades.some((u) => u.levelOwned > 0);
  if (!hasAnyUpgrade) return null;

  const bonuses: { label: string; value: string }[] = [];
  if (mods.extraShelves > 0)
    bonuses.push({ label: "Extra Shelves", value: `+${mods.extraShelves}` });
  if (mods.trafficBonus > 0)
    bonuses.push({
      label: "Traffic",
      value: `+${Math.round(mods.trafficBonus * 100)}%`,
    });
  if (mods.reputationPerDay > 0)
    bonuses.push({
      label: "Rep/Day",
      value: `+${mods.reputationPerDay}`,
    });
  if (mods.xpBonus > 0)
    bonuses.push({
      label: "XP",
      value: `+${Math.round(mods.xpBonus * 100)}%`,
    });
  if (mods.wholesaleDiscount > 0)
    bonuses.push({
      label: "Wholesale",
      value: `-${Math.round(mods.wholesaleDiscount * 100)}%`,
    });
  if (mods.toleranceBonus > 0)
    bonuses.push({
      label: "Tolerance",
      value: `+${Math.round(mods.toleranceBonus * 100)}%`,
    });
  if (mods.extraDisplaySlots > 0)
    bonuses.push({
      label: "Display Slots",
      value: `+${mods.extraDisplaySlots}`,
    });
  if (mods.extraInventoryCapacity > 0)
    bonuses.push({
      label: "Storage",
      value: `+${mods.extraInventoryCapacity}`,
    });

  if (bonuses.length === 0) return null;

  return (
    <div className="border-accent-primary/20 bg-accent-primary/5 mb-6 rounded-xl border p-3">
      <p className="text-accent-primary mb-2 text-xs font-semibold tracking-wide uppercase">
        Active Bonuses
      </p>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {bonuses.map((b) => (
          <span key={b.label} className="text-xs">
            <span className="text-foreground-secondary">{b.label}</span>{" "}
            <span className="font-medium text-green-400">{b.value}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function UpgradeCard({
  upgrade,
  currentLevel,
  shopLevel,
  currency,
  onPurchase,
}: {
  upgrade: UpgradeDefinition;
  currentLevel: number;
  shopLevel: number;
  currency: number;
  onPurchase: (id: string) => void;
}) {
  const isMaxed = currentLevel >= upgrade.maxLevel;
  const cost = getUpgradeCost(upgrade, currentLevel);
  const check = canPurchaseUpgrade(upgrade, currentLevel, shopLevel, currency);

  // Effect description
  const effectText = getEffectDescription(upgrade, currentLevel);

  return (
    <div className="border-card-border bg-card-background rounded-xl border p-4">
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="bg-card-hover flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xl">
          {upgrade.icon}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-medium">{upgrade.name}</h3>
            <LevelBadges
              currentLevel={currentLevel}
              maxLevel={upgrade.maxLevel}
            />
          </div>
          <p className="text-foreground-secondary mt-0.5 text-xs leading-relaxed">
            {upgrade.description}
          </p>
          {currentLevel > 0 && (
            <p className="mt-1 text-xs text-green-400">{effectText}</p>
          )}
          {!isMaxed && shopLevel < upgrade.minShopLevel && (
            <p className="mt-1 text-xs text-yellow-400">
              Requires Shop Level {upgrade.minShopLevel}
            </p>
          )}
        </div>
      </div>

      {/* Purchase button */}
      {!isMaxed && (
        <div className="mt-3 flex items-center justify-between">
          <span className="text-foreground-muted text-xs">
            Level {currentLevel + 1}/{upgrade.maxLevel}
          </span>
          <button
            onClick={() => onPurchase(upgrade.id)}
            disabled={!check.canBuy}
            className={`min-h-[44px] rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              check.canBuy
                ? "bg-accent-primary hover:bg-accent-primary-hover text-white"
                : "bg-card-hover text-foreground-muted cursor-not-allowed"
            }`}
          >
            {cost !== null ? `${cost.toLocaleString()} G` : "Max"}
          </button>
        </div>
      )}

      {isMaxed && (
        <div className="mt-3 text-center">
          <span className="text-xs font-medium text-green-400">Max Level</span>
        </div>
      )}
    </div>
  );
}

function LevelBadges({
  currentLevel,
  maxLevel,
}: {
  currentLevel: number;
  maxLevel: number;
}) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: maxLevel }, (_, i) => (
        <div
          key={i}
          className={`h-1.5 w-3 rounded-full ${
            i < currentLevel ? "bg-accent-primary" : "bg-card-border"
          }`}
        />
      ))}
    </div>
  );
}

function getEffectDescription(
  upgrade: UpgradeDefinition,
  currentLevel: number,
): string {
  if (currentLevel <= 0) return "";
  const total = upgrade.effectPerLevel * currentLevel;

  switch (upgrade.effectType) {
    case "shelf_slot":
      return `+${total} shelf slot${total > 1 ? "s" : ""} active`;
    case "traffic_multiplier":
      return `+${Math.round(total * 100)}% customer traffic`;
    case "reputation_per_day":
      return `+${total} reputation per day`;
    case "xp_multiplier":
      return `+${Math.round(total * 100)}% XP earned`;
    case "wholesale_discount":
      return `-${Math.round(total * 100)}% wholesale prices`;
    case "display_case_slots":
      return `+${total} display case slot${total > 1 ? "s" : ""}`;
    case "tolerance_bonus":
      return `+${Math.round(total * 100)}% price tolerance`;
    case "inventory_capacity":
      return `+${total} inventory capacity`;
    default:
      return "";
  }
}

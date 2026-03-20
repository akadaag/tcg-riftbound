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
  getUpgradeById,
  arePrerequisitesMet,
  type UpgradeModifiers,
} from "@/features/upgrades";
import type { UpgradeDefinition, UpgradeCategory } from "@/types/game";
import { useMemo, useState } from "react";

const CATEGORY_LABELS: Record<UpgradeCategory, string> = {
  operations: "Operations",
  customer_experience: "Customers",
  business: "Business",
};

const CATEGORY_ORDER: UpgradeCategory[] = [
  "operations",
  "customer_experience",
  "business",
];

const CATEGORY_DESCRIPTIONS: Record<UpgradeCategory, string> = {
  operations: "Shelves, storage, and supply chain",
  customer_experience: "Traffic, reputation, and shopping experience",
  business: "XP growth, passive income, and events",
};

export default function UpgradesPage() {
  const { save, purchaseUpgrade } = useGameStore();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<UpgradeCategory>("operations");

  const catalog = getUpgradeCatalog();
  const mods = useMemo(
    () => getUpgradeModifiers(save.upgrades),
    [save.upgrades],
  );

  // Count total owned levels
  const totalLevels = save.upgrades.reduce((acc, u) => acc + u.levelOwned, 0);
  const maxLevels = catalog.reduce((acc, u) => acc + u.maxLevel, 0);

  const upgrades = useMemo(() => getUpgradesByCategory(activeTab), [activeTab]);

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

      {/* Category tabs */}
      <div className="mb-4 flex gap-1 rounded-xl bg-black/20 p-1">
        {CATEGORY_ORDER.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveTab(cat)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === cat
                ? "bg-accent-primary text-white"
                : "text-foreground-secondary hover:text-foreground-primary"
            }`}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Category description */}
      <p className="text-foreground-muted mb-4 text-xs">
        {CATEGORY_DESCRIPTIONS[activeTab]}
      </p>

      {/* Upgrade cards for active tab */}
      <div className="space-y-3">
        {upgrades.map((upgrade) => (
          <UpgradeCard
            key={upgrade.id}
            upgrade={upgrade}
            currentLevel={getOwnedLevel(upgrade.id, save.upgrades)}
            shopLevel={save.shopLevel}
            currency={save.softCurrency}
            ownedUpgrades={save.upgrades}
            onPurchase={handlePurchase}
          />
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
  if (mods.passiveIncome > 0)
    bonuses.push({
      label: "Passive",
      value: `+${Math.floor(mods.passiveIncome)} G/day`,
    });
  if (mods.hypeDecayReduction > 0)
    bonuses.push({
      label: "Hype Decay",
      value: `-${Math.round(mods.hypeDecayReduction * 100)}%`,
    });
  if (mods.eventRevenueBonus > 0)
    bonuses.push({
      label: "Event Rev.",
      value: `+${Math.round(mods.eventRevenueBonus * 100)}%`,
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
  ownedUpgrades,
  onPurchase,
}: {
  upgrade: UpgradeDefinition;
  currentLevel: number;
  shopLevel: number;
  currency: number;
  ownedUpgrades: { upgradeId: string; levelOwned: number }[];
  onPurchase: (id: string) => void;
}) {
  const isMaxed = currentLevel >= upgrade.maxLevel;
  const cost = getUpgradeCost(upgrade, currentLevel);
  const check = canPurchaseUpgrade(
    upgrade,
    currentLevel,
    shopLevel,
    currency,
    ownedUpgrades,
  );

  // Prerequisite info
  const prereqCheck = arePrerequisitesMet(upgrade, ownedUpgrades);
  const prereqLocked = !prereqCheck.met;

  // Effect description
  const effectText = getEffectDescription(upgrade, currentLevel);

  return (
    <div
      className={`border-card-border bg-card-background rounded-xl border p-4 ${
        prereqLocked && !isMaxed ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="bg-card-hover flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xl">
          {prereqLocked && !isMaxed ? "🔒" : upgrade.icon}
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
          {prereqLocked && !isMaxed && (
            <p className="mt-1 text-xs text-orange-400">
              Requires:{" "}
              {prereqCheck.missing
                .map((id) => getUpgradeById(id)?.name ?? id)
                .join(", ")}
            </p>
          )}
          {!prereqLocked && !isMaxed && shopLevel < upgrade.minShopLevel && (
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
    case "passive_income":
      return `+${Math.floor(total)} G per day`;
    case "hype_decay_reduction":
      return `-${Math.round(total * 100)}% hype decay`;
    case "event_revenue_bonus":
      return `+${Math.round(total * 100)}% event revenue`;
    default:
      return "";
  }
}

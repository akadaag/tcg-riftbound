"use client";

import { useGameStore } from "@/stores/game-store";
import {
  getVisibleAreas,
  getAreaEffects,
  canBuildArea,
  canUpgradeArea,
} from "@/features/engine/areas";
import Link from "next/link";

export default function AreasPage() {
  const { save, buildArea, upgradeArea } = useGameStore();

  const visibleAreas = getVisibleAreas(save.shopAreas, save.shopLevel);
  const areaEffects = getAreaEffects(save.shopAreas);

  return (
    <div className="flex flex-1 flex-col px-4 pt-6 pb-4">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <Link
          href="/shop"
          className="text-foreground-secondary hover:text-foreground text-sm"
        >
          &larr; Shop
        </Link>
      </div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Shop Areas</h1>
        <p className="text-foreground-secondary mt-1 text-sm">
          Expand your shop with new areas and upgrade existing ones.
        </p>
        <div className="mt-2 flex items-center gap-3">
          <span className="text-currency-gold text-sm font-bold">
            {save.softCurrency.toLocaleString()} G
          </span>
          <span className="text-foreground-muted text-xs">
            Level {save.shopLevel}
          </span>
        </div>
      </div>

      {/* Active effects summary */}
      {(areaEffects.passiveIncomePerDay > 0 ||
        areaEffects.reputationPerDay > 0 ||
        areaEffects.remoteTraffic > 0) && (
        <div className="border-accent-primary/20 bg-accent-primary/5 mb-6 rounded-xl border p-4">
          <p className="text-foreground-secondary mb-2 text-xs font-semibold tracking-wide uppercase">
            Active Area Bonuses
          </p>
          <div className="flex flex-wrap gap-3 text-sm">
            {areaEffects.passiveIncomePerDay > 0 && (
              <span className="text-currency-gold">
                +{areaEffects.passiveIncomePerDay.toLocaleString()} G/day
              </span>
            )}
            {areaEffects.reputationPerDay > 0 && (
              <span className="text-green-400">
                +{areaEffects.reputationPerDay} rep/day
              </span>
            )}
            {areaEffects.remoteTraffic > 0 && (
              <span className="text-blue-400">
                +{areaEffects.remoteTraffic} remote customers/day
              </span>
            )}
            {areaEffects.trafficBonus > 0 && (
              <span className="text-foreground-secondary">
                +{Math.round(areaEffects.trafficBonus * 100)}% traffic
              </span>
            )}
            {areaEffects.extraSinglesSlots > 0 && (
              <span className="text-foreground-secondary">
                +{areaEffects.extraSinglesSlots} singles slots
              </span>
            )}
            {areaEffects.inventoryCapacityBonus > 0 && (
              <span className="text-foreground-secondary">
                +{areaEffects.inventoryCapacityBonus} storage
              </span>
            )}
          </div>
        </div>
      )}

      {/* Area list */}
      <div className="space-y-4">
        {visibleAreas.map(({ definition, state }) => {
          const isBuilt = state?.isBuilt ?? false;
          const currentTier = state?.tier ?? 0;
          const atMaxTier = isBuilt && currentTier >= definition.maxTier;

          const buildCheck = canBuildArea(
            save.shopAreas,
            definition.id,
            save.softCurrency,
            save.shopLevel,
          );
          const upgradeCheck = canUpgradeArea(
            save.shopAreas,
            definition.id,
            save.softCurrency,
          );

          const nextTierDef = isBuilt
            ? definition.tiers.find((t) => t.tier === currentTier + 1)
            : null;

          return (
            <div
              key={definition.id}
              className={`border-card-border bg-card-background rounded-xl border p-4 ${
                isBuilt ? "" : "opacity-80"
              }`}
            >
              {/* Area header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{definition.icon}</span>
                  <div>
                    <p className="font-semibold">{definition.name}</p>
                    <p className="text-foreground-secondary text-sm">
                      {definition.description}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  {isBuilt ? (
                    <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-xs font-medium text-green-400">
                      Tier {currentTier}/{definition.maxTier}
                    </span>
                  ) : (
                    <span className="rounded-full bg-yellow-500/20 px-2 py-0.5 text-xs font-medium text-yellow-400">
                      Not built
                    </span>
                  )}
                </div>
              </div>

              {/* Current tier benefit */}
              {isBuilt && (
                <div className="mt-3">
                  <p className="text-foreground-secondary text-xs">
                    {definition.tiers
                      .filter((t) => t.tier <= currentTier)
                      .map((t) => t.benefit)
                      .join(" | ")}
                  </p>
                </div>
              )}

              {/* Next tier preview */}
              {isBuilt && nextTierDef && (
                <div className="border-card-border mt-3 rounded-lg border bg-white/5 p-3">
                  <p className="text-foreground-muted mb-1 text-xs font-medium tracking-wide uppercase">
                    Tier {nextTierDef.tier} upgrade
                  </p>
                  <p className="text-foreground-secondary text-sm">
                    {nextTierDef.benefit}
                  </p>
                  <p className="text-currency-gold mt-1 text-sm font-bold">
                    {nextTierDef.cost.toLocaleString()} G
                  </p>
                </div>
              )}

              {/* Build cost (not yet built) */}
              {!isBuilt && (
                <div className="border-card-border mt-3 rounded-lg border bg-white/5 p-3">
                  <p className="text-foreground-secondary text-sm">
                    {definition.tiers[0].benefit}
                  </p>
                  <p className="text-currency-gold mt-1 text-sm font-bold">
                    {definition.buildCost.toLocaleString()} G to build
                  </p>
                </div>
              )}

              {/* Action button */}
              <div className="mt-3">
                {!isBuilt ? (
                  <button
                    onClick={() => buildArea(definition.id)}
                    disabled={!buildCheck.canBuild}
                    className="bg-accent-primary/20 text-accent-primary hover:bg-accent-primary/30 min-h-[44px] w-full rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {buildCheck.canBuild
                      ? `Build — ${definition.buildCost.toLocaleString()} G`
                      : (buildCheck.reason ?? "Locked")}
                  </button>
                ) : atMaxTier ? (
                  <div className="text-foreground-muted py-2 text-center text-sm">
                    Fully upgraded
                  </div>
                ) : (
                  <button
                    onClick={() => upgradeArea(definition.id)}
                    disabled={!upgradeCheck.canUpgrade}
                    className="bg-accent-secondary/20 text-accent-secondary hover:bg-accent-secondary/30 min-h-[44px] w-full rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {upgradeCheck.canUpgrade
                      ? `Upgrade to Tier ${currentTier + 1} — ${upgradeCheck.cost.toLocaleString()} G`
                      : (upgradeCheck.reason ?? "Cannot upgrade")}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

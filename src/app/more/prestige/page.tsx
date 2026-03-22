"use client";

import { useState } from "react";
import Link from "next/link";
import { useGameStore } from "@/stores/game-store";
import {
  PRESTIGE_MIN_LEVEL,
  canPrestige,
  getPrestigeTierLabel,
  getPrestigeBonusSummary,
  getPrestigeStartingGold,
  getPrestigeIncomeMultiplier,
  getPrestigeXPMultiplier,
  getPrestigeTrafficBonus,
} from "@/features/engine/prestige";

export default function PrestigePage() {
  const { save, prestigeReset } = useGameStore();
  const [showConfirm, setShowConfirm] = useState(false);

  const prestigeCount = save.prestigeCount ?? 0;
  const check = canPrestige(save.shopLevel, prestigeCount);
  const tier = getPrestigeTierLabel(prestigeCount);
  const currentBonuses = getPrestigeBonusSummary(prestigeCount);
  const nextBonuses = getPrestigeBonusSummary(prestigeCount + 1);

  const handlePrestige = () => {
    const result = prestigeReset();
    if (result.success) {
      setShowConfirm(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col px-4 pt-6 pb-4">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <Link
          href="/more"
          className="text-foreground-secondary hover:text-foreground flex min-h-[44px] items-center gap-1 px-1 py-2 text-sm"
        >
          <span>&larr;</span> More
        </Link>
      </div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Prestige</h1>
        <p className="text-foreground-secondary mt-1 text-sm">
          Open a new location and start fresh with permanent bonuses.
        </p>
      </div>

      {/* Current Status */}
      <div className="border-card-border bg-card-background mb-6 rounded-xl border p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-foreground-secondary text-xs">Prestige Tier</p>
            <p className={`text-lg font-bold ${tier.color}`}>{tier.label}</p>
          </div>
          <div className="text-right">
            <p className="text-foreground-secondary text-xs">Times Prestiged</p>
            <p className="text-lg font-bold">{prestigeCount}</p>
          </div>
        </div>
      </div>

      {/* Current Bonuses */}
      {currentBonuses.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 text-sm font-semibold">Current Bonuses</h2>
          <div className="space-y-2">
            {currentBonuses.map((bonus) => (
              <div
                key={bonus.label}
                className="border-card-border bg-card-background flex items-center justify-between rounded-lg border p-3"
              >
                <div>
                  <p className="text-sm font-medium">{bonus.label}</p>
                  <p className="text-foreground-secondary text-xs">
                    {bonus.description}
                  </p>
                </div>
                <span className="text-sm font-bold text-green-400">
                  {bonus.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Next Prestige Preview */}
      <div className="mb-6">
        <h2 className="mb-3 text-sm font-semibold">
          {prestigeCount === 0
            ? "What You Get"
            : `Prestige ${prestigeCount + 1} Bonuses`}
        </h2>
        <div className="space-y-2">
          {nextBonuses.map((bonus) => (
            <div
              key={bonus.label}
              className="flex items-center justify-between rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3"
            >
              <div>
                <p className="text-sm font-medium">{bonus.label}</p>
                <p className="text-foreground-secondary text-xs">
                  {bonus.description}
                </p>
              </div>
              <span className="text-sm font-bold text-cyan-400">
                {bonus.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Warning */}
      <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
        <p className="mb-1 text-xs font-medium text-red-400">
          Warning: Prestige Reset
        </p>
        <p className="text-xs text-red-300/80">
          Prestiging will reset your shop level, inventory, collection, shelves,
          upgrades, and currency. Your lifetime stats and prestige bonuses are
          permanent.
        </p>
      </div>

      {/* Prestige Button */}
      {!showConfirm ? (
        <button
          onClick={() => check.canPrestige && setShowConfirm(true)}
          disabled={!check.canPrestige}
          className={`min-h-[44px] w-full rounded-xl py-3 text-sm font-medium transition-colors ${
            check.canPrestige
              ? "bg-cyan-600 text-white hover:bg-cyan-500"
              : "bg-card-border cursor-not-allowed text-gray-500"
          }`}
        >
          {check.canPrestige
            ? `Prestige (Level ${save.shopLevel}/${PRESTIGE_MIN_LEVEL})`
            : (check.reason ?? "Cannot Prestige")}
        </button>
      ) : (
        <div className="space-y-2">
          <p className="text-center text-sm font-medium text-red-400">
            Are you sure? This cannot be undone.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setShowConfirm(false)}
              className="border-card-border bg-card-background hover:bg-card-hover min-h-[44px] flex-1 rounded-xl border py-3 text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handlePrestige}
              className="min-h-[44px] flex-1 rounded-xl bg-red-600 py-3 text-sm font-medium text-white transition-colors hover:bg-red-500"
            >
              Confirm Prestige
            </button>
          </div>
        </div>
      )}

      {/* Requirements */}
      {!check.canPrestige && (
        <p className="text-foreground-secondary mt-3 text-center text-xs">
          {check.reason}
        </p>
      )}
    </div>
  );
}

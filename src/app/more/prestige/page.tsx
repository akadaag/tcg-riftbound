"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { m, AnimatePresence } from "framer-motion";
import { useGameStore } from "@/stores/game-store";
import {
  PRESTIGE_MIN_LEVEL,
  canPrestige,
  getPrestigeTierLabel,
  getPrestigeBonusSummary,
} from "@/features/engine/prestige";
import {
  prestigeBadge,
  ceremonyContainer,
  ceremonyItem,
} from "@/lib/animations";

/** Maps prestige tier Tailwind class to a glow hex color. */
const TIER_GLOW: Record<string, string> = {
  "text-amber-500": "#f59e0b",
  "text-gray-300": "#d1d5db",
  "text-yellow-400": "#facc15",
  "text-cyan-400": "#22d3ee",
  "text-blue-400": "#60a5fa",
};

export default function PrestigePage() {
  const { save, prestigeReset } = useGameStore();
  const [showConfirm, setShowConfirm] = useState(false);
  const [showCeremony, setShowCeremony] = useState(false);
  const [ceremonyCount, setCeremonyCount] = useState(0);

  const prestigeCount = save.prestigeCount ?? 0;
  const check = canPrestige(save.shopLevel, prestigeCount);
  const tier = getPrestigeTierLabel(prestigeCount);
  const currentBonuses = getPrestigeBonusSummary(prestigeCount);
  const nextBonuses = getPrestigeBonusSummary(prestigeCount + 1);

  const handlePrestige = () => {
    const newCount = prestigeCount + 1;
    const result = prestigeReset();
    if (result.success) {
      setShowConfirm(false);
      setCeremonyCount(newCount);
      setShowCeremony(true);
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

      {/* Prestige Ceremony overlay (4D) */}
      <PrestigeCeremony
        show={showCeremony}
        newPrestigeCount={ceremonyCount}
        onDismiss={() => setShowCeremony(false)}
      />
    </div>
  );
}

// ── Prestige Ceremony (4D) ────────────────────────────

function PrestigeCeremony({
  show,
  newPrestigeCount,
  onDismiss,
}: {
  show: boolean;
  newPrestigeCount: number;
  onDismiss: () => void;
}) {
  const tier = getPrestigeTierLabel(newPrestigeCount);
  const bonuses = getPrestigeBonusSummary(newPrestigeCount);
  const glowColor = TIER_GLOW[tier.color] ?? "#22d3ee";

  // Auto-dismiss after 4 s
  useEffect(() => {
    if (!show) return;
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [show, onDismiss]);

  return (
    <AnimatePresence>
      {show && (
        <m.div
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center p-6"
          style={{ backgroundColor: "rgba(0,0,0,0.92)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.5 } }}
          onClick={onDismiss}
          role="dialog"
          aria-modal="true"
          aria-label="Prestige ceremony"
        >
          {/* Radial glow */}
          <div
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
            aria-hidden="true"
          >
            <div
              className="h-80 w-80 rounded-full opacity-15 blur-3xl"
              style={{ backgroundColor: glowColor }}
            />
          </div>

          {/* Prestige badge */}
          <m.div
            className="relative mb-6 text-center"
            variants={prestigeBadge}
            initial="hidden"
            animate="visible"
          >
            <p
              className="text-7xl leading-none font-bold"
              style={{ color: glowColor }}
            >
              ✦
            </p>
            <p className={`mt-2 text-2xl font-bold ${tier.color}`}>
              {tier.label}
            </p>
            <p className="text-foreground-secondary mt-1 text-sm">
              Prestige {newPrestigeCount}
            </p>
          </m.div>

          {/* Bonus list stagger */}
          {bonuses.length > 0 && (
            <m.div
              className="mb-6 w-full max-w-xs space-y-2"
              variants={ceremonyContainer}
              initial="hidden"
              animate="visible"
            >
              {bonuses.slice(0, 4).map((bonus) => (
                <m.div
                  key={bonus.label}
                  className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2"
                  variants={ceremonyItem}
                >
                  <span className="text-sm text-white/80">{bonus.label}</span>
                  <span
                    className="text-sm font-bold"
                    style={{ color: glowColor }}
                  >
                    {bonus.value}
                  </span>
                </m.div>
              ))}
            </m.div>
          )}

          {/* Tagline */}
          <m.p
            className="text-foreground-secondary text-center text-sm italic"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.6, duration: 0.6 }}
          >
            Your new journey begins...
          </m.p>

          <m.p
            className="text-foreground-muted mt-6 text-xs"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            transition={{ delay: 2.2, duration: 0.5 }}
          >
            Tap to continue
          </m.p>
        </m.div>
      )}
    </AnimatePresence>
  );
}

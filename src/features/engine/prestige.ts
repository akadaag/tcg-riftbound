/**
 * Prestige Engine — second location / prestige reset mechanic.
 *
 * C1: At Level 15+, the player can "open a second location" (prestige reset).
 * This resets most progress but grants permanent bonuses:
 *   - +5% income multiplier per prestige
 *   - +250 starting gold per prestige
 *   - +10% rent (from costs.ts) to keep it balanced
 *
 * The bonuses apply multiplicatively to revenue, XP, and passive income,
 * giving late-game players a reason to reset and scale further.
 *
 * Pure functions — no side effects, no React, no store access.
 * @module features/engine/prestige
 */

// ── Constants ──────────────────────────────────────────────────────

/** Minimum shop level required to prestige. */
export const PRESTIGE_MIN_LEVEL = 15;

/** Maximum number of prestige resets (soft cap). */
export const PRESTIGE_MAX_COUNT = 10;

// ── Functions ──────────────────────────────────────────────────────

/**
 * Check if the player can prestige.
 */
export function canPrestige(
  shopLevel: number,
  prestigeCount: number,
): { canPrestige: boolean; reason: string | null } {
  if (shopLevel < PRESTIGE_MIN_LEVEL) {
    return {
      canPrestige: false,
      reason: `Requires Shop Level ${PRESTIGE_MIN_LEVEL} (current: ${shopLevel})`,
    };
  }
  if (prestigeCount >= PRESTIGE_MAX_COUNT) {
    return {
      canPrestige: false,
      reason: `Maximum prestige count reached (${PRESTIGE_MAX_COUNT})`,
    };
  }
  return { canPrestige: true, reason: null };
}

/**
 * Get the income multiplier from prestige.
 * Each prestige grants +5% (additive).
 *
 * @param prestigeCount — number of completed prestige resets
 * @returns multiplier (e.g. 1.0 for 0 prestiges, 1.15 for 3)
 */
export function getPrestigeIncomeMultiplier(prestigeCount: number): number {
  return 1 + prestigeCount * 0.05;
}

/**
 * Get the XP multiplier from prestige.
 * Each prestige grants +3% XP bonus (helps level faster on re-runs).
 */
export function getPrestigeXPMultiplier(prestigeCount: number): number {
  return 1 + prestigeCount * 0.03;
}

/**
 * Get the traffic bonus from prestige (flat additive bonus).
 * Each prestige adds +2% base traffic (compounding with other bonuses).
 */
export function getPrestigeTrafficBonus(prestigeCount: number): number {
  return prestigeCount * 0.02;
}

/**
 * Get a human-readable prestige tier label.
 */
export function getPrestigeTierLabel(prestigeCount: number): {
  label: string;
  color: string;
} {
  if (prestigeCount === 0)
    return { label: "No Prestige", color: "text-foreground-secondary" };
  if (prestigeCount === 1) return { label: "Bronze", color: "text-amber-500" };
  if (prestigeCount === 2) return { label: "Silver", color: "text-gray-300" };
  if (prestigeCount === 3) return { label: "Gold", color: "text-yellow-400" };
  if (prestigeCount <= 5) return { label: "Platinum", color: "text-cyan-400" };
  if (prestigeCount <= 7) return { label: "Diamond", color: "text-blue-400" };
  return { label: "Legendary", color: "text-purple-400" };
}

/**
 * Calculate the starting gold for a prestige reset.
 * 750 base + 250 per prestige count.
 */
export function getPrestigeStartingGold(newPrestigeCount: number): number {
  return 750 + newPrestigeCount * 250;
}

/**
 * Get a summary of all prestige bonuses for display.
 */
export function getPrestigeBonusSummary(prestigeCount: number): Array<{
  label: string;
  value: string;
  description: string;
}> {
  if (prestigeCount === 0) return [];
  return [
    {
      label: "Income Bonus",
      value: `+${prestigeCount * 5}%`,
      description: "Applied to all revenue",
    },
    {
      label: "XP Bonus",
      value: `+${prestigeCount * 3}%`,
      description: "Applied to all XP earned",
    },
    {
      label: "Traffic Bonus",
      value: `+${prestigeCount * 2}%`,
      description: "More customers visit your shop",
    },
    {
      label: "Starting Gold",
      value: `${getPrestigeStartingGold(prestigeCount).toLocaleString()} G`,
      description: "Gold when you start a new run",
    },
  ];
}

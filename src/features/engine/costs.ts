/**
 * Operating Costs Engine — rent calculation and other daily expenses.
 *
 * C3: Daily rent scales with shop level (50G at L1, 500G at L20).
 * Forces the player to stay profitable. Adds mild tension without
 * being punishing.
 *
 * Pure functions — no side effects, no React, no store access.
 * @module features/engine/costs
 */

// ── Rent Constants ──────────────────────────────────────────────────

/**
 * Rent at shop level 1 (base, in soft currency G).
 * Intentionally low so early-game players aren't punished.
 */
const BASE_RENT = 50;

/**
 * Rent at max shop level (L20).
 * High enough to be meaningful but not devastating.
 */
const MAX_RENT = 500;

/**
 * Maximum shop level for rent calculation purposes.
 */
const MAX_LEVEL_FOR_RENT = 20;

// ── Functions ───────────────────────────────────────────────────────

/**
 * Calculate daily rent based on shop level.
 *
 * Rent scales linearly from BASE_RENT (L1) to MAX_RENT (L20).
 * Formula: 50 + (level - 1) * (450 / 19) ≈ 50 + (level - 1) * 23.7
 *
 * Examples:
 *   L1:  50G
 *   L5:  145G
 *   L10: 263G
 *   L15: 382G
 *   L20: 500G
 *
 * @param shopLevel — current shop level (1–20)
 * @param prestigeCount — number of prestige resets (C1). Each prestige adds +10% rent.
 */
export function calculateRent(
  shopLevel: number,
  prestigeCount: number = 0,
): number {
  const clampedLevel = Math.max(1, Math.min(MAX_LEVEL_FOR_RENT, shopLevel));
  const baseRent = Math.round(
    BASE_RENT +
      ((clampedLevel - 1) * (MAX_RENT - BASE_RENT)) / (MAX_LEVEL_FOR_RENT - 1),
  );

  // Prestige increases rent slightly (+10% per prestige) to scale with bonuses
  const prestigeMultiplier = 1 + prestigeCount * 0.1;
  return Math.round(baseRent * prestigeMultiplier);
}

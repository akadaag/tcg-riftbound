/**
 * Customer Satisfaction Engine — tracks and aggregates satisfaction.
 *
 * C4: Satisfaction score based on pricing, stock availability, and staff.
 * Affects reputation gain rate. Gives the player something to optimize
 * beyond pure profit.
 *
 * Pure functions — no side effects, no React, no store access.
 * @module features/engine/satisfaction
 */

import type { DayReport, StaffMember } from "@/types/game";

// ── Constants ───────────────────────────────────────────────────────

/**
 * Weight of today's satisfaction vs the running average.
 * 0.3 = today contributes 30%, history contributes 70%.
 * This creates a smoothed rolling average that doesn't swing wildly.
 */
const DAILY_WEIGHT = 0.3;

/**
 * Default satisfaction score for new saves (50 = neutral).
 */
export const DEFAULT_SATISFACTION = 50;

// ── Functions ───────────────────────────────────────────────────────

/**
 * Calculate the daily satisfaction score (0-100) from:
 *  - Average customer satisfaction from visits (priceSentiment/buy rate)
 *  - Stock availability (what % of visits resulted in sales)
 *  - Staff morale average (higher morale = better service)
 *
 * @param satisfactionSum — sum of per-customer satisfaction values (0-1 each)
 * @param satisfactionCount — number of customer visits contributing satisfaction
 * @param customersVisited — total customers who visited
 * @param customersPurchased — total customers who purchased
 * @param staff — current staff members
 */
export function calculateDailySatisfaction(
  satisfactionSum: number,
  satisfactionCount: number,
  customersVisited: number,
  customersPurchased: number,
  staff: StaffMember[],
): number {
  if (customersVisited === 0) return DEFAULT_SATISFACTION;

  // 1. Average satisfaction from pricing (0-100)
  //    Based on per-customer satisfaction scores collected during simulation
  const avgPriceSatisfaction =
    satisfactionCount > 0 ? (satisfactionSum / satisfactionCount) * 100 : 50;

  // 2. Stock availability score (0-100)
  //    What percentage of visitors managed to buy something
  const buyRate = customersPurchased / customersVisited;
  const stockScore = Math.min(100, buyRate * 120); // Slight bonus if most buy

  // 3. Staff morale bonus (0-20 range, added on top)
  //    Average staff morale / 5 → contributes 0-20 points
  let staffBonus = 0;
  if (staff.length > 0) {
    const avgMorale =
      staff.reduce((sum, s) => sum + s.morale, 0) / staff.length;
    staffBonus = avgMorale / 5; // 0-20
  }

  // Weighted combination: 50% pricing, 30% stock, 20% staff
  const raw =
    avgPriceSatisfaction * 0.5 + stockScore * 0.3 + staffBonus * 0.2 * 5; // Scale staff bonus to match

  return Math.round(Math.max(0, Math.min(100, raw)));
}

/**
 * Update the rolling satisfaction score.
 * Smooths today's score into the running average.
 *
 * @param currentScore — the running satisfaction score (0-100)
 * @param dailyScore — today's computed satisfaction (0-100)
 * @returns updated rolling score (0-100)
 */
export function updateRollingSatisfaction(
  currentScore: number,
  dailyScore: number,
): number {
  const updated = currentScore * (1 - DAILY_WEIGHT) + dailyScore * DAILY_WEIGHT;
  return Math.round(Math.max(0, Math.min(100, updated)));
}

/**
 * Get the reputation gain multiplier based on satisfaction score.
 *
 * Score 0-30:   0.7x  (poor — penalizes rep gain)
 * Score 31-49:  0.9x  (below average)
 * Score 50-69:  1.0x  (neutral)
 * Score 70-89:  1.15x (good — bonus rep gain)
 * Score 90-100: 1.3x  (excellent — strong bonus)
 */
export function getSatisfactionRepMultiplier(score: number): number {
  if (score >= 90) return 1.3;
  if (score >= 70) return 1.15;
  if (score >= 50) return 1.0;
  if (score >= 31) return 0.9;
  return 0.7;
}

/**
 * Get a human-readable label for the satisfaction score.
 */
export function getSatisfactionLabel(score: number): {
  label: string;
  color: string;
} {
  if (score >= 90) return { label: "Excellent", color: "text-green-400" };
  if (score >= 70) return { label: "Good", color: "text-green-300" };
  if (score >= 50) return { label: "Average", color: "text-yellow-300" };
  if (score >= 31) return { label: "Below Average", color: "text-orange-400" };
  return { label: "Poor", color: "text-red-400" };
}

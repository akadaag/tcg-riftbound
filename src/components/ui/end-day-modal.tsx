"use client";

import { useEffect, useCallback } from "react";
import { m, AnimatePresence } from "framer-motion";
import {
  overlayVariants,
  modalVariants,
  levelUpPulse,
  staggerContainer,
  stampItem,
} from "@/lib/animations";
import type { DayReport, GameEvent } from "@/types/game";
import { getSatisfactionLabel } from "@/features/engine/satisfaction";

interface EndDayModalProps {
  isOpen: boolean;
  dayReport: DayReport;
  xpEarned: number;
  levelsGained: number;
  newLevel: number;
  nextDayEvent: GameEvent | null;
  completedMissions?: string[];
  setCompletions?: Array<{ setCode: string; setName: string; reward: number }>;
  /** Revenue from singles sales this day. */
  singlesRevenue?: number;
  /** Reputation change this day. */
  reputationChange?: number;
  /** Staff payroll paid this day. */
  staffPayroll?: number;
  /** Passive income this day (areas + upgrades + rep tier). */
  passiveIncome?: number;
  /** Reputation tier name (e.g. "Newcomer"). */
  reputationTierName?: string;
  /** Average daily revenue (lifetime). */
  avgDayRevenue?: number;
  /** A3: Gold bonus for leveling up. */
  levelUpGoldBonus?: number;
  /** C3: Daily rent paid. */
  rentPaid?: number;
  /** C4: Rolling satisfaction score (0-100). */
  satisfactionScore?: number;
  /** C4: Today's daily satisfaction score (0-100). */
  satisfactionDailyScore?: number;
  onClose: () => void;
}

export function EndDayModal({
  isOpen,
  dayReport,
  xpEarned,
  levelsGained,
  newLevel,
  nextDayEvent,
  completedMissions,
  setCompletions,
  singlesRevenue,
  reputationChange,
  staffPayroll,
  passiveIncome,
  reputationTierName,
  avgDayRevenue,
  levelUpGoldBonus,
  rentPaid,
  satisfactionScore,
  satisfactionDailyScore,
  onClose,
}: EndDayModalProps) {
  // Escape key handler
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleKeyDown]);

  return (
    <AnimatePresence>
      {isOpen && (
        <m.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={`Day ${dayReport.day} complete summary`}
        >
          <m.div
            className="bg-background border-card-border max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-2xl border p-6"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <h2 className="mb-1 text-center text-xl font-bold">
              Day {dayReport.day} Complete
            </h2>
            <p className="text-foreground-secondary mb-6 text-center text-sm">
              End of day summary
            </p>

            {/* Level up animation (A3: with gold bonus) */}
            <AnimatePresence>
              {levelsGained > 0 && (
                <m.div
                  className="border-accent-primary/50 bg-accent-primary/10 relative mb-4 overflow-hidden rounded-xl border p-4 text-center"
                  variants={levelUpPulse}
                  initial="hidden"
                  animate="visible"
                >
                  <CoinParticles />
                  <p className="text-accent-primary text-lg font-bold">
                    Level Up!
                  </p>
                  <p className="text-foreground-secondary text-sm">
                    Shop is now Level {newLevel}
                  </p>
                  {(levelUpGoldBonus ?? 0) > 0 && (
                    <m.p
                      className="text-currency-gold mt-2 text-sm font-semibold"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{
                        delay: 0.3,
                        type: "spring",
                        stiffness: 300,
                      }}
                    >
                      +{(levelUpGoldBonus ?? 0).toLocaleString()} G bonus!
                    </m.p>
                  )}
                </m.div>
              )}
            </AnimatePresence>

            {/* Stats Grid */}
            <m.div
              className="mb-6 space-y-3"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              <StatRow
                label="Revenue"
                value={`${dayReport.revenue.toLocaleString()} G`}
                color="text-currency-gold"
                comparison={
                  avgDayRevenue
                    ? formatComparison(dayReport.revenue, avgDayRevenue)
                    : undefined
                }
              />
              <StatRow
                label="Profit"
                value={`${dayReport.profit.toLocaleString()} G`}
                color={
                  dayReport.profit >= 0 ? "text-green-400" : "text-red-400"
                }
                profitGlow={dayReport.profit >= 0 ? "positive" : "negative"}
              />
              {(singlesRevenue ?? 0) > 0 && (
                <StatRow
                  label="Singles Revenue"
                  value={`${(singlesRevenue ?? 0).toLocaleString()} G`}
                  color="text-currency-gold"
                />
              )}
              {(passiveIncome ?? 0) > 0 && (
                <StatRow
                  label="Passive Income"
                  value={`+${(passiveIncome ?? 0).toLocaleString()} G`}
                  color="text-blue-400"
                />
              )}
              {(staffPayroll ?? 0) > 0 && (
                <StatRow
                  label="Staff Payroll"
                  value={`-${(staffPayroll ?? 0).toLocaleString()} G`}
                  color="text-red-400"
                />
              )}
              {(rentPaid ?? 0) > 0 && (
                <StatRow
                  label="Rent"
                  value={`-${(rentPaid ?? 0).toLocaleString()} G`}
                  color="text-red-400"
                />
              )}
              <StatRow
                label="Customers"
                value={`${dayReport.customersPurchased}/${dayReport.customersVisited}`}
              />
              <StatRow
                label="Items Sold"
                value={Object.values(dayReport.productsSold)
                  .reduce((a, b) => a + b, 0)
                  .toString()}
              />
              <StatRow
                label="Packs Opened"
                value={dayReport.packsOpened.toString()}
              />
              <StatRow
                label="New Cards"
                value={dayReport.newCardsDiscovered.toString()}
                color="text-green-400"
              />

              {satisfactionScore !== undefined && (
                <StatRow
                  label="Satisfaction"
                  value={`${satisfactionDailyScore ?? satisfactionScore}/100 (${getSatisfactionLabel(satisfactionScore).label})`}
                  color={getSatisfactionLabel(satisfactionScore).color}
                />
              )}

              {/* Divider */}
              <div className="border-card-border border-t" />

              <StatRow
                label="XP Earned"
                value={`+${xpEarned} XP`}
                color="text-accent-primary"
              />
              {reputationChange !== undefined && reputationChange > 0 && (
                <StatRow
                  label="Reputation"
                  value={`+${reputationChange}`}
                  color="text-purple-400"
                />
              )}
              {reputationTierName && (
                <StatRow
                  label="Tier"
                  value={reputationTierName}
                  color="text-purple-300"
                />
              )}
            </m.div>

            {/* Completed missions */}
            {completedMissions && completedMissions.length > 0 && (
              <m.div
                className="mb-6 rounded-lg border border-green-500/30 bg-green-500/10 p-3"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <p className="mb-2 text-xs font-medium text-green-400">
                  Missions Completed
                </p>
                <div className="space-y-1">
                  {completedMissions.map((name) => (
                    <p key={name} className="text-sm text-green-300">
                      {name}
                    </p>
                  ))}
                </div>
              </m.div>
            )}

            {/* Set completion rewards */}
            {setCompletions && setCompletions.length > 0 && (
              <m.div
                className="mb-6 rounded-lg border border-purple-500/30 bg-purple-500/10 p-3"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
              >
                <p className="mb-2 text-xs font-medium text-purple-400">
                  Set Complete!
                </p>
                <div className="space-y-1">
                  {setCompletions.map((sc) => (
                    <div
                      key={sc.setCode}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-purple-300">{sc.setName}</span>
                      <span className="text-currency-gold font-medium">
                        +{sc.reward.toLocaleString()} G
                      </span>
                    </div>
                  ))}
                </div>
              </m.div>
            )}

            {/* Upcoming event preview */}
            {nextDayEvent && (
              <m.div
                className="mb-6 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <p className="mb-0.5 text-xs font-medium text-yellow-400/80">
                  Upcoming Event
                </p>
                <p className="text-sm font-medium text-yellow-300">
                  {nextDayEvent.name}
                </p>
                <p className="text-xs text-yellow-400/60">
                  {nextDayEvent.description}
                </p>
              </m.div>
            )}

            {/* Continue button */}
            <m.button
              onClick={onClose}
              className="bg-accent-primary hover:bg-accent-primary-hover min-h-[44px] w-full rounded-xl py-3 text-sm font-medium text-white transition-colors"
              whileTap={{ scale: 0.97 }}
            >
              Start Day {dayReport.day + 1}
            </m.button>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
}

function formatComparison(
  today: number,
  avg: number,
): { text: string; color: string } | undefined {
  if (avg <= 0) return undefined;
  const diff = today - avg;
  const pct = Math.round((diff / avg) * 100);
  if (pct === 0) return { text: "avg", color: "text-foreground-secondary" };
  const sign = pct > 0 ? "+" : "";
  return {
    text: `${sign}${pct}% vs avg`,
    color: pct > 0 ? "text-green-400" : "text-red-400",
  };
}

// ── Coin rain for level-up (4A) ───────────────────────

/** Stable coin positions — defined outside component to avoid instability. */
const COINS = [
  { id: 0, x: 5, delay: 0, size: 7 },
  { id: 1, x: 16, delay: 0.07, size: 6 },
  { id: 2, x: 27, delay: 0.13, size: 8 },
  { id: 3, x: 37, delay: 0.04, size: 7 },
  { id: 4, x: 48, delay: 0.19, size: 9 },
  { id: 5, x: 58, delay: 0.1, size: 6 },
  { id: 6, x: 68, delay: 0.23, size: 8 },
  { id: 7, x: 77, delay: 0.08, size: 7 },
  { id: 8, x: 87, delay: 0.16, size: 6 },
  { id: 9, x: 94, delay: 0.03, size: 8 },
] as const;

function CoinParticles() {
  return (
    <>
      {COINS.map((coin) => (
        <span
          key={coin.id}
          className="coin-particle absolute rounded-full"
          style={{
            left: `${coin.x}%`,
            top: "15%",
            width: coin.size,
            height: coin.size,
            backgroundColor: "var(--currency-gold)",
            animationDelay: `${coin.delay}s`,
          }}
          aria-hidden="true"
        />
      ))}
    </>
  );
}

// ── Stat Row (4C: stamp-in + profit glow) ────────────

function StatRow({
  label,
  value,
  color,
  comparison,
  profitGlow,
}: {
  label: string;
  value: string;
  color?: string;
  comparison?: { text: string; color: string };
  profitGlow?: "positive" | "negative";
}) {
  const glowClass =
    profitGlow === "positive"
      ? "stat-profit-positive"
      : profitGlow === "negative"
        ? "stat-profit-negative"
        : "";
  return (
    <m.div
      className={`flex items-center justify-between text-sm ${glowClass}`}
      variants={stampItem}
    >
      <span className="text-foreground-secondary">{label}</span>
      <span className="flex items-center gap-2">
        {comparison && (
          <span className={`text-xs ${comparison.color}`}>
            {comparison.text}
          </span>
        )}
        <span className={`font-medium ${color ?? "text-foreground"}`}>
          {value}
        </span>
      </span>
    </m.div>
  );
}

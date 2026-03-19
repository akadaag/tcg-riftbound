"use client";

import { useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  overlayVariants,
  modalVariants,
  levelUpPulse,
  staggerContainer,
  staggerItem,
} from "@/lib/animations";
import type { DayReport, GameEvent } from "@/types/game";

interface EndDayModalProps {
  isOpen: boolean;
  dayReport: DayReport;
  xpEarned: number;
  levelsGained: number;
  newLevel: number;
  nextDayEvent: GameEvent | null;
  completedMissions?: string[];
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
        <motion.div
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
          <motion.div
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

            {/* Level up animation */}
            <AnimatePresence>
              {levelsGained > 0 && (
                <motion.div
                  className="border-accent-primary/50 bg-accent-primary/10 mb-4 rounded-xl border p-4 text-center"
                  variants={levelUpPulse}
                  initial="hidden"
                  animate="visible"
                >
                  <p className="text-accent-primary text-lg font-bold">
                    Level Up!
                  </p>
                  <p className="text-foreground-secondary text-sm">
                    Shop is now Level {newLevel}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Stats Grid */}
            <motion.div
              className="mb-6 space-y-3"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              <StatRow
                label="Revenue"
                value={`${dayReport.revenue.toLocaleString()} G`}
                color="text-currency-gold"
              />
              <StatRow
                label="Profit"
                value={`${dayReport.profit.toLocaleString()} G`}
                color={
                  dayReport.profit >= 0 ? "text-green-400" : "text-red-400"
                }
              />
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

              {/* Divider */}
              <div className="border-card-border border-t" />

              <StatRow
                label="XP Earned"
                value={`+${xpEarned} XP`}
                color="text-accent-primary"
              />
            </motion.div>

            {/* Completed missions */}
            {completedMissions && completedMissions.length > 0 && (
              <motion.div
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
              </motion.div>
            )}

            {/* Upcoming event preview */}
            {nextDayEvent && (
              <motion.div
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
              </motion.div>
            )}

            {/* Continue button */}
            <motion.button
              onClick={onClose}
              className="bg-accent-primary hover:bg-accent-primary-hover min-h-[44px] w-full rounded-xl py-3 text-sm font-medium text-white transition-colors"
              whileTap={{ scale: 0.97 }}
            >
              Start Day {dayReport.day + 1}
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function StatRow({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <motion.div
      className="flex items-center justify-between text-sm"
      variants={staggerItem}
    >
      <span className="text-foreground-secondary">{label}</span>
      <span className={`font-medium ${color ?? "text-foreground"}`}>
        {value}
      </span>
    </motion.div>
  );
}

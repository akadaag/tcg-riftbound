"use client";

import type { DayReport, GameEvent } from "@/types/game";

interface EndDayModalProps {
  isOpen: boolean;
  dayReport: DayReport;
  xpEarned: number;
  levelsGained: number;
  newLevel: number;
  nextDayEvent: GameEvent | null;
  onClose: () => void;
}

export function EndDayModal({
  isOpen,
  dayReport,
  xpEarned,
  levelsGained,
  newLevel,
  nextDayEvent,
  onClose,
}: EndDayModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
      <div className="bg-background border-card-border w-full max-w-sm rounded-2xl border p-6">
        {/* Header */}
        <h2 className="mb-1 text-center text-xl font-bold">
          Day {dayReport.day} Complete
        </h2>
        <p className="text-foreground-secondary mb-6 text-center text-sm">
          End of day summary
        </p>

        {/* Level up animation */}
        {levelsGained > 0 && (
          <div className="border-accent-primary/50 bg-accent-primary/10 mb-4 rounded-xl border p-4 text-center">
            <p className="text-accent-primary text-lg font-bold">Level Up!</p>
            <p className="text-foreground-secondary text-sm">
              Shop is now Level {newLevel}
            </p>
          </div>
        )}

        {/* Stats Grid */}
        <div className="mb-6 space-y-3">
          <StatRow
            label="Revenue"
            value={`${dayReport.revenue.toLocaleString()} G`}
            color="text-currency-gold"
          />
          <StatRow
            label="Profit"
            value={`${dayReport.profit.toLocaleString()} G`}
            color={dayReport.profit >= 0 ? "text-green-400" : "text-red-400"}
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
        </div>

        {/* Upcoming event preview */}
        {nextDayEvent && (
          <div className="mb-6 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3">
            <p className="mb-0.5 text-xs font-medium text-yellow-400/80">
              Upcoming Event
            </p>
            <p className="text-sm font-medium text-yellow-300">
              {nextDayEvent.name}
            </p>
            <p className="text-xs text-yellow-400/60">
              {nextDayEvent.description}
            </p>
          </div>
        )}

        {/* Continue button */}
        <button
          onClick={onClose}
          className="bg-accent-primary hover:bg-accent-primary-hover w-full rounded-xl py-3 text-sm font-medium text-white transition-colors"
        >
          Start Day {dayReport.day + 1}
        </button>
      </div>
    </div>
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
    <div className="flex items-center justify-between text-sm">
      <span className="text-foreground-secondary">{label}</span>
      <span className={`font-medium ${color ?? "text-foreground"}`}>
        {value}
      </span>
    </div>
  );
}

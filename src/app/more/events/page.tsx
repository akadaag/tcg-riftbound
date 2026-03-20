"use client";

import { useState } from "react";
import Link from "next/link";
import { useGameStore } from "@/stores/game-store";
import {
  PLAYER_EVENT_DEFINITIONS,
  EVENT_PLANNER_UNLOCK_LEVEL,
  checkEventRequirements,
  getActivePlannedEvents,
  getCompletedPlannedEvents,
} from "@/features/engine/event-planner";
import type { PlayerEventType, PlannedEvent } from "@/types/game";

export default function EventsPage() {
  const { save, planEvent, cancelPlannedEvent } = useGameStore();
  const [confirmType, setConfirmType] = useState<PlayerEventType | null>(null);
  const [feedback, setFeedback] = useState<{
    message: string;
    ok: boolean;
  } | null>(null);

  const {
    shopLevel,
    softCurrency,
    shopAreas,
    staff,
    plannedEvents,
    playerEventCooldowns,
    currentDay,
  } = save;

  const isLocked = shopLevel < EVENT_PLANNER_UNLOCK_LEVEL;
  const activePlanned = getActivePlannedEvents(plannedEvents ?? []);
  const completedPlanned = getCompletedPlannedEvents(plannedEvents ?? []).slice(
    0,
    5,
  );

  function handlePlan(type: PlayerEventType) {
    const result = planEvent(type);
    if (result.success) {
      setFeedback({
        message: "Event planned! Prep begins tomorrow.",
        ok: true,
      });
    } else {
      setFeedback({
        message: result.reason ?? "Cannot plan event.",
        ok: false,
      });
    }
    setConfirmType(null);
    setTimeout(() => setFeedback(null), 3000);
  }

  function handleCancel(eventId: string) {
    cancelPlannedEvent(eventId);
    setFeedback({ message: "Event cancelled. No refund.", ok: false });
    setTimeout(() => setFeedback(null), 3000);
  }

  return (
    <div className="flex flex-1 flex-col px-4 pt-6 pb-6">
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
        <h1 className="text-2xl font-bold">Events</h1>
        <p className="text-foreground-secondary mt-1 text-sm">
          Plan and host events to drive traffic and revenue.
        </p>
      </div>

      {/* Locked state */}
      {isLocked && (
        <div className="border-card-border bg-card-background rounded-xl border p-6 text-center">
          <p className="text-foreground-muted text-sm">
            Event Planner unlocks at Shop Level {EVENT_PLANNER_UNLOCK_LEVEL}.
          </p>
          <p className="text-foreground-muted mt-1 text-xs">
            You are Level {shopLevel}.
          </p>
        </div>
      )}

      {/* Feedback banner */}
      {feedback && (
        <div
          className={`mb-4 rounded-xl border p-3 text-sm ${
            feedback.ok
              ? "border-green-500/30 bg-green-500/10 text-green-400"
              : "border-red-500/30 bg-red-500/10 text-red-400"
          }`}
        >
          {feedback.message}
        </div>
      )}

      {!isLocked && (
        <>
          {/* Active / Preparing Events */}
          {activePlanned.length > 0 && (
            <section className="mb-6">
              <h2 className="text-foreground-secondary mb-3 text-xs font-semibold tracking-wider uppercase">
                Active &amp; Preparing
              </h2>
              <div className="space-y-2">
                {activePlanned.map((pe) => (
                  <ActiveEventCard
                    key={pe.id}
                    event={pe}
                    onCancel={handleCancel}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Available Events */}
          <section className="mb-6">
            <h2 className="text-foreground-secondary mb-3 text-xs font-semibold tracking-wider uppercase">
              Available Events
            </h2>
            <div className="space-y-3">
              {PLAYER_EVENT_DEFINITIONS.map((def) => {
                const check = checkEventRequirements(
                  def.type,
                  shopLevel,
                  softCurrency,
                  shopAreas,
                  staff ?? [],
                  plannedEvents ?? [],
                  playerEventCooldowns ?? {},
                  currentDay,
                );
                const tooLow = shopLevel < def.requirements.minShopLevel;

                if (tooLow) return null;

                const isConfirming = confirmType === def.type;

                return (
                  <div
                    key={def.type}
                    className="border-card-border bg-card-background rounded-xl border p-4"
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold">
                          {def.icon} {def.name}
                        </p>
                        <p className="text-foreground-secondary mt-0.5 text-sm">
                          {def.description}
                        </p>
                        <p className="text-foreground-muted mt-1 text-xs italic">
                          {def.flavorText}
                        </p>
                      </div>
                      <div className="shrink-0 text-right text-xs">
                        <p className="text-currency-gold font-bold">
                          {def.cost.toLocaleString()} G
                        </p>
                        <p className="text-foreground-muted">
                          {def.prepDays}d prep · {def.duration}d event
                        </p>
                      </div>
                    </div>

                    {/* Requirements checklist */}
                    <div className="mb-3 space-y-0.5">
                      {def.requirements.requiredAreaId && (
                        <RequirementRow
                          label={`${def.requirements.requiredAreaId.replace(/_/g, " ")} built`}
                          met={shopAreas.some(
                            (a) =>
                              a.areaId === def.requirements.requiredAreaId &&
                              a.isBuilt,
                          )}
                        />
                      )}
                      {def.requirements.requiredStaffRole && (
                        <RequirementRow
                          label={`${def.requirements.requiredStaffRole} on staff`}
                          met={(staff ?? []).some(
                            (s) =>
                              s.role === def.requirements.requiredStaffRole &&
                              s.isActive,
                          )}
                        />
                      )}
                      <RequirementRow
                        label={`${def.cost.toLocaleString()} G available`}
                        met={softCurrency >= def.cost}
                      />
                    </div>

                    {/* Reason why can't plan */}
                    {!check.canPlan && check.reasons.length > 0 && (
                      <p className="text-foreground-muted mb-2 text-xs">
                        {check.reasons[0]}
                      </p>
                    )}

                    {/* Plan button / confirm */}
                    {isConfirming ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handlePlan(def.type)}
                          className="flex-1 rounded-lg bg-green-600 py-2 text-sm font-medium text-white active:bg-green-700"
                        >
                          Confirm — spend {def.cost.toLocaleString()} G
                        </button>
                        <button
                          onClick={() => setConfirmType(null)}
                          className="border-card-border rounded-lg border px-4 py-2 text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        disabled={!check.canPlan}
                        onClick={() => setConfirmType(def.type)}
                        className={`w-full rounded-lg py-2 text-sm font-medium transition-colors ${
                          check.canPlan
                            ? "bg-accent text-white hover:opacity-90 active:opacity-80"
                            : "border-card-border bg-card-background text-foreground-muted cursor-not-allowed border opacity-40"
                        }`}
                      >
                        Plan Event
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Recent Events */}
          {completedPlanned.length > 0 && (
            <section>
              <h2 className="text-foreground-secondary mb-3 text-xs font-semibold tracking-wider uppercase">
                Recent Events
              </h2>
              <div className="space-y-2">
                {completedPlanned.map((pe) => (
                  <CompletedEventCard key={pe.id} event={pe} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────

function RequirementRow({ label, met }: { label: string; met: boolean }) {
  return (
    <p className={`text-xs ${met ? "text-green-400" : "text-red-400"}`}>
      {met ? "✓" : "✗"} {label}
    </p>
  );
}

function ActiveEventCard({
  event,
  onCancel,
}: {
  event: PlannedEvent;
  onCancel: (id: string) => void;
}) {
  const isPreparing = event.status === "preparing";

  return (
    <div className="border-card-border bg-card-background flex items-center justify-between rounded-xl border p-4">
      <div>
        <p className="font-medium">{event.name}</p>
        {isPreparing ? (
          <p className="text-foreground-secondary text-xs">
            Preparing — {event.prepDaysLeft} day
            {event.prepDaysLeft !== 1 ? "s" : ""} until event
          </p>
        ) : (
          <p className="text-xs text-green-400">Running now</p>
        )}
      </div>
      {isPreparing && (
        <button
          onClick={() => onCancel(event.id)}
          className="text-foreground-muted text-xs hover:text-red-400"
        >
          Cancel
        </button>
      )}
    </div>
  );
}

function CompletedEventCard({ event }: { event: PlannedEvent }) {
  const result = event.result;

  return (
    <div className="border-card-border bg-card-background rounded-xl border p-4 opacity-75">
      <p className="font-medium">{event.name}</p>
      {result ? (
        <div className="text-foreground-secondary mt-1 flex gap-3 text-xs">
          <span>{result.customersAttracted} customers</span>
          <span>+{result.reputationGained} rep</span>
          <span>+{result.hypeBoost} hype</span>
        </div>
      ) : (
        <p className="text-foreground-muted text-xs">Completed</p>
      )}
    </div>
  );
}

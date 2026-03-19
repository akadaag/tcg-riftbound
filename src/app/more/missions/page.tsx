"use client";

import { useState, useMemo } from "react";
import { useGameStore } from "@/stores/game-store";
import { useToast } from "@/components/ui/toast";
import {
  generateDailyMissions,
  generateWeeklyMissions,
  getMilestoneMissions,
  evaluateMissionProgress,
} from "@/features/missions";
import type {
  MissionDefinition,
  MissionProgress,
  MissionScope,
} from "@/types/game";
import { WEEK_LENGTH } from "@/types/game";

type Tab = "daily" | "weekly" | "milestones";

export default function MissionsPage() {
  const { save, claimMissionReward } = useGameStore();
  const [activeTab, setActiveTab] = useState<Tab>("daily");
  const { toast } = useToast();

  // Generate active mission definitions
  const dailyMissions = useMemo(
    () => generateDailyMissions(save.shopLevel, save.currentDay),
    [save.shopLevel, save.currentDay],
  );
  const weeklyMissions = useMemo(
    () => generateWeeklyMissions(save.shopLevel, save.currentDay),
    [save.shopLevel, save.currentDay],
  );
  const milestoneMissions = useMemo(() => getMilestoneMissions(), []);

  // Progress lookup
  const progressMap = useMemo(() => {
    const map = new Map<string, MissionProgress>();
    for (const p of save.missions) {
      map.set(p.missionId, p);
    }
    return map;
  }, [save.missions]);

  // Count completed/claimed for tabs
  const dailyStats = getMissionStats(dailyMissions, progressMap, save);
  const weeklyStats = getMissionStats(weeklyMissions, progressMap, save);
  const milestoneStats = getMissionStats(milestoneMissions, progressMap, save);

  // Week info
  const currentWeek = Math.floor((save.currentDay - 1) / WEEK_LENGTH) + 1;
  const daysUntilWeekReset =
    WEEK_LENGTH - ((save.currentDay - 1) % WEEK_LENGTH);

  function handleClaim(missionId: string, mission: MissionDefinition) {
    const success = claimMissionReward(missionId, mission);
    if (success) {
      const rewardLabel =
        mission.rewardType === "currency"
          ? `${mission.rewardValue} G`
          : mission.rewardType === "xp"
            ? `${mission.rewardValue} XP`
            : `${mission.rewardValue} Rep`;
      toast(`Claimed: +${rewardLabel}`, "success");
    }
  }

  const activeMissions =
    activeTab === "daily"
      ? dailyMissions
      : activeTab === "weekly"
        ? weeklyMissions
        : milestoneMissions;

  return (
    <div className="flex flex-1 flex-col px-4 pt-6 pb-4">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Missions</h1>
        <p className="text-foreground-secondary mt-1 text-sm">
          Complete objectives to earn rewards and progress.
        </p>
      </div>

      {/* Tab bar */}
      <div className="mb-4 flex gap-2">
        <TabButton
          label="Daily"
          count={`${dailyStats.completed}/${dailyMissions.length}`}
          isActive={activeTab === "daily"}
          onClick={() => setActiveTab("daily")}
        />
        <TabButton
          label="Weekly"
          count={`${weeklyStats.completed}/${weeklyMissions.length}`}
          isActive={activeTab === "weekly"}
          onClick={() => setActiveTab("weekly")}
        />
        <TabButton
          label="Milestones"
          count={`${milestoneStats.claimed}/${milestoneMissions.length}`}
          isActive={activeTab === "milestones"}
          onClick={() => setActiveTab("milestones")}
        />
      </div>

      {/* Context info */}
      {activeTab === "daily" && (
        <p className="text-foreground-muted mb-4 text-xs">
          Day {save.currentDay} — Resets at end of day
        </p>
      )}
      {activeTab === "weekly" && (
        <p className="text-foreground-muted mb-4 text-xs">
          Week {currentWeek} — Resets in {daysUntilWeekReset} day
          {daysUntilWeekReset !== 1 ? "s" : ""}
        </p>
      )}
      {activeTab === "milestones" && (
        <p className="text-foreground-muted mb-4 text-xs">
          Permanent achievements — never reset
        </p>
      )}

      {/* Mission list */}
      <div className="space-y-3">
        {activeMissions.map((mission) => {
          const progress = progressMap.get(mission.id);
          return (
            <MissionCard
              key={mission.id}
              mission={mission}
              progress={progress}
              currentValue={getMissionCurrentValue(mission, progress, save)}
              onClaim={() => handleClaim(mission.id, mission)}
            />
          );
        })}
      </div>

      {activeMissions.length === 0 && (
        <div className="border-card-border bg-card-background mt-4 rounded-xl border p-6 text-center">
          <p className="text-foreground-muted text-sm">
            No missions available yet.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────

function TabButton({
  label,
  count,
  isActive,
  onClick,
}: {
  label: string;
  count: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex min-h-[44px] flex-1 flex-col items-center justify-center rounded-lg px-2 py-2 text-xs font-medium transition-colors ${
        isActive
          ? "bg-accent-primary text-white"
          : "bg-card-background text-foreground-secondary border-card-border border"
      }`}
    >
      <span>{label}</span>
      <span
        className={`text-[10px] ${isActive ? "text-white/70" : "text-foreground-muted"}`}
      >
        {count}
      </span>
    </button>
  );
}

function MissionCard({
  mission,
  progress,
  currentValue,
  onClaim,
}: {
  mission: MissionDefinition;
  progress: MissionProgress | undefined;
  currentValue: number;
  onClaim: () => void;
}) {
  const isCompleted =
    progress?.completed ?? currentValue >= mission.targetValue;
  const isClaimed = progress?.claimed ?? false;
  const pct = Math.min(
    100,
    Math.round((currentValue / mission.targetValue) * 100),
  );

  const rewardLabel =
    mission.rewardType === "currency"
      ? `${mission.rewardValue.toLocaleString()} G`
      : mission.rewardType === "xp"
        ? `${mission.rewardValue} XP`
        : `${mission.rewardValue} Rep`;

  const rewardColor =
    mission.rewardType === "currency"
      ? "text-currency-gold"
      : mission.rewardType === "xp"
        ? "text-accent-primary"
        : "text-green-400";

  return (
    <div
      className={`border-card-border bg-card-background rounded-xl border p-4 transition-opacity ${
        isClaimed ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium">{mission.title}</h3>
            {isCompleted && !isClaimed && (
              <span className="rounded-full bg-green-500/20 px-1.5 py-0.5 text-[10px] font-medium text-green-400">
                Complete
              </span>
            )}
            {isClaimed && (
              <span className="text-foreground-muted bg-card-hover rounded-full px-1.5 py-0.5 text-[10px] font-medium">
                Claimed
              </span>
            )}
          </div>
          <p className="text-foreground-secondary mt-0.5 text-xs">
            {mission.description}
          </p>
        </div>

        {/* Reward */}
        <div className="shrink-0 text-right">
          <p className={`text-xs font-medium ${rewardColor}`}>{rewardLabel}</p>
        </div>
      </div>

      {/* Progress bar */}
      {!isClaimed && (
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-foreground-muted">
              {currentValue.toLocaleString()}/
              {mission.targetValue.toLocaleString()}
            </span>
            <span className="text-foreground-muted">{pct}%</span>
          </div>
          <div className="bg-card-border h-1.5 w-full overflow-hidden rounded-full">
            <div
              className={`h-full rounded-full transition-all ${
                isCompleted ? "bg-green-500" : "bg-accent-primary"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {/* Claim button */}
      {isCompleted && !isClaimed && (
        <button
          onClick={onClaim}
          className="bg-accent-primary hover:bg-accent-primary-hover mt-3 min-h-[44px] w-full rounded-lg py-2 text-sm font-medium text-white transition-colors"
        >
          Claim Reward
        </button>
      )}
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────

function getMissionCurrentValue(
  mission: MissionDefinition,
  progress: MissionProgress | undefined,
  save: { shopLevel: number; todayReport: any; stats: any },
): number {
  // For weekly missions, use accumulated progress from the progress entry
  if (mission.scope === "weekly" && progress) {
    // For weekly missions, currentValue accumulates across days.
    // Also add today's current contribution for live display.
    const todayContrib = evaluateMissionProgress(
      { ...mission, scope: "daily" } as MissionDefinition,
      save as any,
    );
    return progress.currentValue + todayContrib;
  }

  // For daily and milestones, evaluate from save state directly
  return evaluateMissionProgress(mission, save as any);
}

function getMissionStats(
  missions: MissionDefinition[],
  progressMap: Map<string, MissionProgress>,
  save: any,
): { completed: number; claimed: number } {
  let completed = 0;
  let claimed = 0;
  for (const m of missions) {
    const p = progressMap.get(m.id);
    const val = getMissionCurrentValue(m, p, save);
    if (p?.claimed) {
      claimed++;
      completed++;
    } else if (p?.completed || val >= m.targetValue) {
      completed++;
    }
  }
  return { completed, claimed };
}

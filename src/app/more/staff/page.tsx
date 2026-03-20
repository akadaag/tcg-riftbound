"use client";

import { useState } from "react";
import Link from "next/link";
import { useGameStore } from "@/stores/game-store";
import {
  getMaxStaffSlots,
  getStaffEffects,
  calculatePayroll,
  STAFF_UNLOCK_LEVEL,
} from "@/features/engine/staff";
import type { StaffMember, StaffCandidate, StaffRole } from "@/types/game";

// ── Role metadata ────────────────────────────────────────────────────

const ROLE_LABELS: Record<StaffRole, string> = {
  cashier: "Cashier",
  stocker: "Stocker",
  buyer: "Buyer",
  greeter: "Greeter",
  security: "Security",
  specialist: "Specialist",
};

const ROLE_EFFECT_LABEL: Record<StaffRole, string> = {
  cashier: "+tolerance (conversion)",
  stocker: "+reputation/day",
  buyer: "+wholesale discount",
  greeter: "+traffic",
  security: "+tolerance & +rep",
  specialist: "+competitive/collector draw",
};

// ── Morale bar ───────────────────────────────────────────────────────

function MoraleBar({ morale }: { morale: number }) {
  const pct = Math.max(0, Math.min(100, morale));
  const color =
    pct >= 60 ? "bg-green-500" : pct >= 30 ? "bg-yellow-500" : "bg-red-500";

  return (
    <div className="flex items-center gap-2">
      <div className="bg-card-border h-2 w-20 overflow-hidden rounded-full">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-foreground-secondary text-xs">{pct}%</span>
    </div>
  );
}

// ── XP progress bar ──────────────────────────────────────────────────

function XPBar({
  xp,
  xpToNext,
  level,
}: {
  xp: number;
  xpToNext: number;
  level: number;
}) {
  if (level >= 5 || xpToNext === 0) {
    return <span className="text-xs text-yellow-400">Max level</span>;
  }
  const pct = Math.min(100, Math.round((xp / xpToNext) * 100));
  return (
    <div className="flex items-center gap-2">
      <div className="bg-card-border h-1.5 w-16 overflow-hidden rounded-full">
        <div
          className="h-full rounded-full bg-blue-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-foreground-muted text-xs">
        {xp}/{xpToNext} XP
      </span>
    </div>
  );
}

// ── Staff card ───────────────────────────────────────────────────────

function StaffCard({
  member,
  onFire,
  onRaise,
}: {
  member: StaffMember;
  onFire: () => void;
  onRaise: () => void;
}) {
  return (
    <div className="border-card-border bg-card-background rounded-xl border p-4">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{member.name}</span>
            <span className="bg-card-border text-foreground-secondary rounded px-1.5 py-0.5 text-xs">
              {ROLE_LABELS[member.role]}
            </span>
            <span className="text-foreground-secondary text-xs">
              Lv {member.level}
            </span>
          </div>
          <p className="text-foreground-secondary mt-1 text-xs">
            {ROLE_EFFECT_LABEL[member.role]}
          </p>
          <div className="mt-2 space-y-1">
            <div className="flex items-center gap-3">
              <span className="text-foreground-muted w-14 text-xs">Morale</span>
              <MoraleBar morale={member.morale} />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-foreground-muted w-14 text-xs">XP</span>
              <XPBar
                xp={member.xp}
                xpToNext={member.xpToNextLevel}
                level={member.level}
              />
            </div>
            <div className="text-foreground-secondary text-xs">
              Salary:{" "}
              <span className="text-foreground font-medium">
                {member.salary}G/day
              </span>
            </div>
          </div>
        </div>
        <div className="ml-3 flex shrink-0 flex-col gap-2">
          <button
            onClick={onRaise}
            className="rounded-lg border border-blue-500/30 bg-blue-500/20 px-2 py-1 text-xs text-blue-400 transition-colors hover:bg-blue-500/30"
          >
            Raise +10G
          </button>
          <button
            onClick={onFire}
            className="rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1 text-xs text-red-400 transition-colors hover:bg-red-500/20"
          >
            Fire
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Candidate card ───────────────────────────────────────────────────

function CandidateCard({
  candidate,
  canHire,
  onHire,
}: {
  candidate: StaffCandidate;
  canHire: boolean;
  onHire: () => void;
}) {
  return (
    <div className="border-card-border bg-card-background rounded-xl border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{candidate.name}</span>
            <span className="bg-card-border text-foreground-secondary rounded px-1.5 py-0.5 text-xs">
              {ROLE_LABELS[candidate.role]}
            </span>
            <span className="text-foreground-secondary text-xs">
              Lv {candidate.level}
            </span>
          </div>
          <p className="text-foreground-secondary mt-1 text-xs">
            {candidate.description}
          </p>
          <p className="text-foreground-secondary mt-1 text-xs">
            Salary:{" "}
            <span className="text-foreground font-medium">
              {candidate.salary}G/day
            </span>
          </p>
        </div>
        <button
          onClick={onHire}
          disabled={!canHire}
          className={`shrink-0 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
            canHire
              ? "border-green-500/30 bg-green-500/20 text-green-400 hover:bg-green-500/30"
              : "bg-card-border border-card-border text-foreground-muted cursor-not-allowed opacity-50"
          }`}
        >
          Hire
        </button>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────

export default function StaffPage() {
  const {
    save,
    hireStaffMember,
    fireStaffMember,
    giveStaffRaise,
    refreshStaffCandidates,
  } = useGameStore();

  const [message, setMessage] = useState<string | null>(null);

  const staff = save.staff ?? [];
  const candidates = save.staffCandidates ?? [];
  const maxSlots = getMaxStaffSlots(save.shopLevel);
  const isLocked = save.shopLevel < STAFF_UNLOCK_LEVEL;
  const payroll = calculatePayroll(staff);
  const effects = getStaffEffects(staff);

  function showMsg(msg: string) {
    setMessage(msg);
    setTimeout(() => setMessage(null), 2500);
  }

  function handleHire(candidateId: string) {
    const result = hireStaffMember(candidateId);
    if (!result.success) {
      showMsg(result.reason ?? "Could not hire");
    } else {
      showMsg("Staff member hired!");
    }
  }

  function handleFire(staffId: string, name: string) {
    fireStaffMember(staffId);
    showMsg(`${name} has been let go.`);
  }

  function handleRaise(staffId: string) {
    const result = giveStaffRaise(staffId, 10);
    if (!result.success) {
      showMsg(result.reason ?? "Could not give raise");
    } else {
      showMsg("Raise given! Morale boosted.");
    }
  }

  if (isLocked) {
    return (
      <div className="flex flex-1 flex-col px-4 pt-6">
        <div className="mb-4 flex items-center gap-3">
          <Link
            href="/more"
            className="text-foreground-secondary hover:text-foreground text-sm"
          >
            &larr; More
          </Link>
        </div>
        <div className="border-card-border bg-card-background rounded-xl border p-6 text-center">
          <p className="text-lg font-semibold">Staff System</p>
          <p className="text-foreground-secondary mt-2 text-sm">
            Unlocks at shop level {STAFF_UNLOCK_LEVEL}.
          </p>
          <p className="text-foreground-muted mt-1 text-xs">
            You are currently level {save.shopLevel}.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col px-4 pt-6 pb-8">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <Link
          href="/more"
          className="text-foreground-secondary hover:text-foreground text-sm"
        >
          &larr; More
        </Link>
      </div>
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Staff</h1>
        <p className="text-foreground-secondary mt-1 text-sm">
          Hire and manage your team. Staff are paid at end of day.
        </p>
      </div>

      {/* Toast message */}
      {message && (
        <div className="bg-card-border mb-4 rounded-lg px-4 py-2 text-sm">
          {message}
        </div>
      )}

      {/* Summary bar */}
      <div className="border-card-border bg-card-background mb-6 grid grid-cols-3 divide-x divide-current rounded-xl border text-center">
        <div className="p-3">
          <p className="text-foreground-secondary text-xs">Staff</p>
          <p className="font-bold">
            {staff.length}/{maxSlots}
          </p>
        </div>
        <div className="p-3">
          <p className="text-foreground-secondary text-xs">Daily payroll</p>
          <p className="font-bold">{payroll}G</p>
        </div>
        <div className="p-3">
          <p className="text-foreground-secondary text-xs">Traffic bonus</p>
          <p className="font-bold">
            {effects.trafficBonus > 0
              ? `+${Math.round(effects.trafficBonus * 100)}%`
              : "—"}
          </p>
        </div>
      </div>

      {/* Active bonuses */}
      {staff.length > 0 && (
        <div className="border-card-border bg-card-background mb-6 rounded-xl border p-4">
          <p className="text-foreground-secondary mb-2 text-xs font-semibold tracking-wide uppercase">
            Active bonuses
          </p>
          <div className="space-y-1 text-sm">
            {effects.trafficBonus > 0 && (
              <p>Traffic +{Math.round(effects.trafficBonus * 100)}%</p>
            )}
            {effects.toleranceBonus > 0 && (
              <p>Tolerance +{Math.round(effects.toleranceBonus * 100)}%</p>
            )}
            {effects.wholesaleDiscount > 0 && (
              <p>Wholesale -{Math.round(effects.wholesaleDiscount * 100)}%</p>
            )}
            {effects.reputationPerDay > 0 && (
              <p>Reputation +{effects.reputationPerDay.toFixed(1)}/day</p>
            )}
            {effects.competitiveCustomerBonus > 0 && (
              <p>
                Competitive draw +
                {Math.round(effects.competitiveCustomerBonus * 100)}%
              </p>
            )}
          </div>
        </div>
      )}

      {/* Current staff roster */}
      <section className="mb-6">
        <h2 className="text-foreground-secondary mb-3 text-sm font-semibold tracking-wide uppercase">
          Your Team ({staff.length}/{maxSlots})
        </h2>
        {staff.length === 0 ? (
          <p className="text-foreground-muted text-sm">
            No staff hired yet. Hire someone from the candidates below.
          </p>
        ) : (
          <div className="space-y-3">
            {staff.map((member) => (
              <StaffCard
                key={member.id}
                member={member}
                onFire={() => handleFire(member.id, member.name)}
                onRaise={() => handleRaise(member.id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Hiring pool */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-foreground-secondary text-sm font-semibold tracking-wide uppercase">
            Available to Hire
          </h2>
          <button
            onClick={() => {
              refreshStaffCandidates();
              showMsg("Candidate pool refreshed.");
            }}
            className="border-card-border bg-card-background hover:bg-card-hover rounded-lg border px-3 py-1 text-xs transition-colors"
          >
            Refresh
          </button>
        </div>
        {candidates.length === 0 ? (
          <p className="text-foreground-muted text-sm">
            No candidates available. Check back tomorrow or refresh.
          </p>
        ) : (
          <div className="space-y-3">
            {candidates.map((candidate) => (
              <CandidateCard
                key={candidate.id}
                candidate={candidate}
                canHire={staff.length < maxSlots}
                onHire={() => handleHire(candidate.id)}
              />
            ))}
          </div>
        )}
        {staff.length >= maxSlots && staff.length > 0 && (
          <p className="text-foreground-muted mt-3 text-xs">
            Staff slots full. Upgrade your shop or fire a staff member to hire
            more.
          </p>
        )}
      </section>
    </div>
  );
}

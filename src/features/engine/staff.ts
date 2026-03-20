/**
 * Staff Engine — pure functions for the Staff System (M15).
 *
 * All functions are side-effect free. The UI/store calls these and
 * dispatches results to Zustand.
 *
 * @module features/engine/staff
 */

import type {
  StaffMember,
  StaffCandidate,
  StaffRole,
  StaffEffects,
} from "@/types/game";

// ── Constants ────────────────────────────────────────────────────────

/** Minimum shop level required to hire staff. */
export const STAFF_UNLOCK_LEVEL = 3;

/** Morale threshold below which staff quits. */
const MORALE_QUIT_THRESHOLD = 30;

/** Starting morale for new hires. */
const STARTING_MORALE = 80;

/** XP per day worked (before level scaling). */
const XP_PER_DAY = 10;

/** XP thresholds per level (index = current level, value = XP to next). */
const STAFF_XP_THRESHOLDS = [0, 50, 120, 250, 500, 0]; // level 5 = max, no next level

/** Salary ranges per role (base salary for level 1). */
const BASE_SALARY: Record<StaffRole, number> = {
  cashier: 30,
  stocker: 25,
  buyer: 45,
  greeter: 20,
  security: 35,
  specialist: 55,
};

/** Effect value per level (additive multiplier, 10% per level above 1). */
function levelMultiplier(level: number): number {
  return 1 + (level - 1) * 0.1;
}

// ── Max staff slots by shop level ────────────────────────────────────

const STAFF_SLOTS_BY_LEVEL: Array<[number, number]> = [
  [1, 1],
  [3, 2],
  [5, 3],
  [8, 4],
  [10, 5],
  [13, 6],
  [15, 7],
  [18, 8],
  [20, 10],
];

/** Returns the maximum number of staff slots for a given shop level. */
export function getMaxStaffSlots(shopLevel: number): number {
  let slots = 0;
  for (const [minLevel, maxSlots] of STAFF_SLOTS_BY_LEVEL) {
    if (shopLevel >= minLevel) slots = maxSlots;
  }
  return slots;
}

// ── Name pool ────────────────────────────────────────────────────────

const STAFF_NAMES = [
  "Alex",
  "Sam",
  "Jordan",
  "Casey",
  "Morgan",
  "Taylor",
  "Jamie",
  "Riley",
  "Avery",
  "Quinn",
  "Drew",
  "Skyler",
  "Parker",
  "Reese",
  "Sage",
  "Blake",
  "Harley",
  "Finley",
  "Rowan",
  "Emery",
  "Charlie",
  "Frankie",
  "Kendall",
  "Logan",
  "Marlowe",
  "Nico",
  "Piper",
  "Remy",
  "Shay",
  "Toby",
];

const ROLE_DESCRIPTIONS: Record<StaffRole, string[]> = {
  cashier: [
    "Speeds up checkout, reducing customer wait times.",
    "Keeps the register running smoothly.",
    "Friendly and efficient at the till.",
  ],
  stocker: [
    "Restocks shelves quickly between customer rushes.",
    "Organized and methodical with inventory.",
    "Never lets a shelf run empty.",
  ],
  buyer: [
    "Negotiates better wholesale deals for the shop.",
    "Has a nose for value in the supply chain.",
    "Secures discounts from distributors.",
  ],
  greeter: [
    "Welcomes customers and drives foot traffic.",
    "Their enthusiasm brings in more visitors.",
    "Word gets around — people want to visit.",
  ],
  security: [
    "Keeps the shop safe and customers comfortable.",
    "Calm presence that deters trouble.",
    "Customers feel at ease with them around.",
  ],
  specialist: [
    "Deep card knowledge appeals to collectors and competitors.",
    "Can talk shop with even the most serious players.",
    "Their expertise draws high-value customers.",
  ],
};

// ── Candidate generation ─────────────────────────────────────────────

/** Seeded pseudo-random number (deterministic per day). */
function seededRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function pickRandom<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

/**
 * Generate a fresh pool of 3–5 staff candidates for the given day.
 * The pool is deterministic for a given day seed so it stays stable
 * throughout the day even if the player revisits the screen.
 */
export function generateCandidates(
  day: number,
  shopLevel: number,
): StaffCandidate[] {
  const rng = seededRng(day * 31337 + shopLevel * 7919);

  const allRoles: StaffRole[] = [
    "cashier",
    "stocker",
    "buyer",
    "greeter",
    "security",
    "specialist",
  ];
  const count = 3 + Math.floor(rng() * 3); // 3–5

  const usedNames = new Set<string>();
  const candidates: StaffCandidate[] = [];

  for (let i = 0; i < count; i++) {
    const role = pickRandom(allRoles, rng) as StaffRole;
    // Higher shop levels can occasionally yield level 2–3 candidates
    const maxStartLevel = Math.min(3, 1 + Math.floor(shopLevel / 5));
    const level = 1 + Math.floor(rng() * maxStartLevel);

    let name: string;
    do {
      name = pickRandom(STAFF_NAMES, rng);
    } while (usedNames.has(name) && usedNames.size < STAFF_NAMES.length);
    usedNames.add(name);

    const baseSalary = BASE_SALARY[role];
    // Salary scales with level (level 2 = +30%, level 3 = +60%)
    const salary = Math.round(baseSalary * (1 + (level - 1) * 0.3));

    const descriptions = ROLE_DESCRIPTIONS[role];
    const description = pickRandom(descriptions, rng);

    candidates.push({
      id: `candidate_${day}_${i}`,
      name,
      role,
      level,
      salary,
      morale: STARTING_MORALE,
      description,
    });
  }

  return candidates;
}

// ── Hire / Fire ──────────────────────────────────────────────────────

/**
 * Hire a candidate. Returns the new StaffMember or null if the roster is full.
 */
export function hireStaff(
  candidate: StaffCandidate,
  currentStaff: StaffMember[],
  shopLevel: number,
  currentDay: number,
): StaffMember | null {
  const maxSlots = getMaxStaffSlots(shopLevel);
  if (currentStaff.length >= maxSlots) return null;

  const member: StaffMember = {
    id: `staff_${candidate.id}_${Date.now()}`,
    name: candidate.name,
    role: candidate.role,
    level: candidate.level,
    xp: 0,
    xpToNextLevel: STAFF_XP_THRESHOLDS[candidate.level] ?? 0,
    salary: candidate.salary,
    morale: candidate.morale,
    assignedAreaId: null,
    hiredDay: currentDay,
    isActive: true,
  };

  return member;
}

/**
 * Remove a staff member from the roster (fire or quit).
 */
export function fireStaff(
  staff: StaffMember[],
  staffId: string,
): StaffMember[] {
  return staff.filter((s) => s.id !== staffId);
}

// ── Payroll ──────────────────────────────────────────────────────────

/** Total daily payroll for all active staff. */
export function calculatePayroll(staff: StaffMember[]): number {
  return staff.reduce((sum, s) => (s.isActive ? sum + s.salary : sum), 0);
}

// ── Daily staff update (XP + morale + level-ups + quit check) ────────

export interface StaffDayResult {
  /** Updated roster (quitters removed). */
  updatedStaff: StaffMember[];
  /** Staff IDs that quit due to low morale. */
  quitIds: string[];
  /** Staff IDs that levelled up. */
  leveledUpIds: string[];
}

/**
 * Apply one day's end-of-day effects to each staff member:
 * - XP gain
 * - Level-up check
 * - Morale change (paid vs unpaid)
 * - Remove staff whose morale dropped below the quit threshold
 *
 * @param paid — whether payroll was successfully paid this day
 */
export function applyDayToStaff(
  staff: StaffMember[],
  paid: boolean,
): StaffDayResult {
  const quitIds: string[] = [];
  const leveledUpIds: string[] = [];
  const updatedStaff: StaffMember[] = [];

  for (const member of staff) {
    if (!member.isActive) {
      updatedStaff.push(member);
      continue;
    }

    // Morale change
    const moraleDelta = paid ? 5 : -10;
    const naturalDecay = -2;
    let newMorale = Math.min(
      100,
      Math.max(0, member.morale + moraleDelta + naturalDecay),
    );

    // XP gain (reduced if morale < 50)
    const xpGain = newMorale >= 50 ? XP_PER_DAY : Math.floor(XP_PER_DAY / 2);
    let newXp = member.xp + xpGain;
    let newLevel = member.level;
    let newXpToNext = member.xpToNextLevel;
    let didLevelUp = false;

    // Level-up check (max level 5)
    if (newLevel < 5 && newXp >= newXpToNext && newXpToNext > 0) {
      newLevel = newLevel + 1;
      newXp = newXp - newXpToNext;
      newXpToNext = STAFF_XP_THRESHOLDS[newLevel] ?? 0;
      didLevelUp = true;
      // Level-up boosts morale by 10
      newMorale = Math.min(100, newMorale + 10);
    }

    if (newMorale < MORALE_QUIT_THRESHOLD) {
      quitIds.push(member.id);
      // Do not add to updatedStaff — they've quit
    } else {
      if (didLevelUp) leveledUpIds.push(member.id);
      updatedStaff.push({
        ...member,
        morale: newMorale,
        xp: newXp,
        level: newLevel,
        xpToNextLevel: newXpToNext,
        // Salary scales with level-up
        salary: didLevelUp
          ? Math.round(BASE_SALARY[member.role] * (1 + (newLevel - 1) * 0.3))
          : member.salary,
      });
    }
  }

  return { updatedStaff, quitIds, leveledUpIds };
}

// ── Give raise ───────────────────────────────────────────────────────

/**
 * Give a raise to a staff member. Increases salary by a flat amount
 * and boosts morale by 20.
 */
export function giveRaise(
  staff: StaffMember[],
  staffId: string,
  raiseAmount: number,
): StaffMember[] {
  return staff.map((s) =>
    s.id === staffId
      ? {
          ...s,
          salary: s.salary + raiseAmount,
          morale: Math.min(100, s.morale + 20),
        }
      : s,
  );
}

// ── Staff effects ─────────────────────────────────────────────────────

/**
 * Aggregate bonuses from all active staff members into a StaffEffects object.
 */
export function getStaffEffects(staff: StaffMember[]): StaffEffects {
  const effects: StaffEffects = {
    trafficBonus: 0,
    toleranceBonus: 0,
    wholesaleDiscount: 0,
    reputationPerDay: 0,
    competitiveCustomerBonus: 0,
  };

  for (const member of staff) {
    if (!member.isActive) continue;
    const mult = levelMultiplier(member.level);

    switch (member.role) {
      case "cashier":
        // Cashiers improve conversion via tolerance (price sensitivity)
        effects.toleranceBonus += 0.05 * mult;
        break;
      case "stocker":
        // Stockers are passive (handled at day-start restock logic)
        // Small reputation gain for a well-stocked shop
        effects.reputationPerDay += 0.5 * mult;
        break;
      case "buyer":
        // Buyers reduce wholesale prices
        effects.wholesaleDiscount += 0.03 * mult;
        break;
      case "greeter":
        // Greeters bring in more foot traffic
        effects.trafficBonus += 0.1 * mult;
        break;
      case "security":
        // Security improves comfort (tolerance) + small reputation
        effects.toleranceBonus += 0.04 * mult;
        effects.reputationPerDay += 0.5 * mult;
        break;
      case "specialist":
        // Specialists draw serious players and collectors
        effects.competitiveCustomerBonus += 0.08 * mult;
        break;
    }
  }

  return effects;
}

// ── Candidate refresh ────────────────────────────────────────────────

/**
 * Returns a new candidate pool if the current one is stale (different day),
 * otherwise returns the existing pool.
 */
export function refreshCandidatesIfNeeded(
  currentCandidates: StaffCandidate[],
  lastRefreshedDay: number,
  currentDay: number,
  shopLevel: number,
): { candidates: StaffCandidate[]; refreshedDay: number } {
  if (currentDay === lastRefreshedDay && currentCandidates.length > 0) {
    return { candidates: currentCandidates, refreshedDay: lastRefreshedDay };
  }
  return {
    candidates: generateCandidates(currentDay, shopLevel),
    refreshedDay: currentDay,
  };
}

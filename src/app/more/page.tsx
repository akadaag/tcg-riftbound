"use client";

import Link from "next/link";
import { useGameStore } from "@/stores/game-store";
import { TRADER_UNLOCK_LEVEL } from "@/features/trader";
import { STAFF_UNLOCK_LEVEL } from "@/features/engine/staff";
import { EVENT_PLANNER_UNLOCK_LEVEL } from "@/features/engine/event-planner";

interface MenuItem {
  label: string;
  description: string;
  href: string;
  unlockLevel?: number;
}

const menuItems: MenuItem[] = [
  {
    label: "Upgrades",
    description: "Improve your shop with new features and boosts",
    href: "/more/upgrades",
  },
  {
    label: "Card Trader",
    description: "Trade 5 duplicate cards for 1 of the next rarity",
    href: "/more/trader",
    unlockLevel: TRADER_UNLOCK_LEVEL,
  },
  {
    label: "Staff",
    description: "Hire and manage your team to boost shop performance",
    href: "/more/staff",
    unlockLevel: STAFF_UNLOCK_LEVEL,
  },
  {
    label: "Events",
    description: "Plan and host events to drive traffic and revenue",
    href: "/more/events",
    unlockLevel: EVENT_PLANNER_UNLOCK_LEVEL,
  },
  {
    label: "Missions",
    description: "Track objectives and claim rewards",
    href: "/more/missions",
  },
  {
    label: "Statistics",
    description: "View your shop and collection stats",
    href: "/more/stats",
  },
  {
    label: "Settings",
    description: "Account, sync status, and preferences",
    href: "/more/settings",
  },
];

export default function MorePage() {
  const { save } = useGameStore();

  return (
    <div className="flex flex-1 flex-col px-4 pt-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">More</h1>
        <p className="text-foreground-secondary mt-1 text-sm">
          Upgrades, missions, settings, and more.
        </p>
      </div>

      {/* Menu items */}
      <div className="space-y-2">
        {menuItems.map((item) => {
          const isLocked =
            item.unlockLevel !== undefined && save.shopLevel < item.unlockLevel;

          if (isLocked) {
            return (
              <div
                key={item.href}
                className="border-card-border bg-card-background flex items-center justify-between rounded-xl border p-4 opacity-50"
              >
                <div>
                  <p className="text-foreground-muted font-medium">
                    {item.label} 🔒
                  </p>
                  <p className="text-foreground-muted text-sm">
                    Unlocks at shop level {item.unlockLevel}
                  </p>
                </div>
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className="border-card-border bg-card-background hover:bg-card-hover active:bg-card-hover flex items-center justify-between rounded-xl border p-4 transition-colors"
            >
              <div>
                <p className="font-medium">{item.label}</p>
                <p className="text-foreground-secondary text-sm">
                  {item.description}
                </p>
              </div>
              <span className="text-foreground-muted">&rarr;</span>
            </Link>
          );
        })}
      </div>

      {/* App info */}
      <div className="mt-auto pt-8 pb-4 text-center">
        <p className="text-foreground-muted text-xs">Riftbound Shop v0.1.0</p>
        <p className="text-foreground-muted text-xs">
          Sync status: <span className="text-warning">Offline</span>
        </p>
      </div>
    </div>
  );
}

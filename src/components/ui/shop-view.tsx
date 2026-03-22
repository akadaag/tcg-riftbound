"use client";

/**
 * ShopView — compact animated shop visualization for the home dashboard.
 *
 * Features (Phase 3):
 *  3A  CSS-shape shop: rounded background, horizontal shelves, counter, door
 *  3B  Customer dot: enters from door, moves to shelf, buys or leaves
 *  3C  Staff dots: stationed near shelves, color-coded by role
 *  3D  Sale flash: register area flashes gold, "+N G" floats up
 *  3E  Night mode: shop dims, "CLOSED" overlay, no customer dots
 *
 * @module components/ui/shop-view
 */

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import type {
  ShelfSlot,
  DayPhase,
  StaffMember,
  CustomerType,
  StaffRole,
} from "@/types/game";
import type { TickCustomerVisit } from "@/features/engine/simulation";

// ── Constants ─────────────────────────────────────────

const CUSTOMER_COLORS: Record<CustomerType, string> = {
  casual: "#3b82f6", // blue
  collector: "#a855f7", // purple
  competitive: "#ef4444", // red
  kid: "#22c55e", // green
  whale: "#eab308", // gold
};

const STAFF_COLORS: Record<StaffRole, string> = {
  cashier: "#f97316", // orange
  stocker: "#14b8a6", // teal
  buyer: "#6366f1", // indigo
  greeter: "#ec4899", // pink
  security: "#64748b", // slate
  specialist: "#f59e0b", // amber
};

/** Customer animation stages and their durations in ms */
const STAGE_DURATIONS = {
  enter: 600, // walk from door to shelf
  browse: 800, // pause at shelf
  toRegister: 500, // walk to register (if buying)
  leave: 600, // walk out the door
};

type CustomerStage =
  | "enter"
  | "browse"
  | "toRegister"
  | "atRegister"
  | "leave"
  | "gone";

interface CustomerAnim {
  id: string;
  type: CustomerType;
  purchased: boolean;
  revenue: number;
  stage: CustomerStage;
  shelfIndex: number; // which shelf they go to
}

// ── Position helpers (% based for responsive layout) ──

/** Door position (left side) */
const DOOR = { x: 5, y: 72 };
/** Register/counter position (right side) */
const REGISTER = { x: 82, y: 75 };
/** Shelf Y positions — up to 4 shelves */
const SHELF_Y = [30, 44, 58, 72];
/** Shelf X center */
const SHELF_X = 48;

function getStagePosition(
  stage: CustomerStage,
  shelfIndex: number,
): { x: number; y: number } {
  switch (stage) {
    case "enter":
      return DOOR;
    case "browse":
      return { x: SHELF_X, y: SHELF_Y[shelfIndex] ?? SHELF_Y[0] };
    case "toRegister":
    case "atRegister":
      return REGISTER;
    case "leave":
    case "gone":
      return DOOR;
    default:
      return DOOR;
  }
}

// ── Component ─────────────────────────────────────────

interface ShopViewProps {
  shelves: ShelfSlot[];
  staff: StaffMember[];
  currentPhase: DayPhase;
  lastCustomerVisit: TickCustomerVisit | null;
}

export function ShopView({
  shelves,
  staff,
  currentPhase,
  lastCustomerVisit,
}: ShopViewProps) {
  const isNight = currentPhase === "night";
  const [customer, setCustomer] = useState<CustomerAnim | null>(null);
  const [saleFlash, setSaleFlash] = useState(false);
  const [saleAmount, setSaleAmount] = useState<number | null>(null);
  const stageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevVisitIdRef = useRef<string | null>(null);

  // Which shelves are actually stocked
  const stockedShelves = useMemo(
    () =>
      shelves
        .map((s, i) => ({ ...s, index: i }))
        .filter((s) => s.productId !== null),
    [shelves],
  );

  // Active staff for display
  const activeStaff = useMemo(() => staff.filter((s) => s.isActive), [staff]);

  // Advance customer animation through stages
  const advanceStage = useCallback((current: CustomerAnim) => {
    if (stageTimerRef.current) clearTimeout(stageTimerRef.current);

    let nextStage: CustomerStage;
    let delay: number;

    switch (current.stage) {
      case "enter":
        nextStage = "browse";
        delay = STAGE_DURATIONS.enter;
        break;
      case "browse":
        if (current.purchased) {
          nextStage = "toRegister";
          delay = STAGE_DURATIONS.browse;
        } else {
          nextStage = "leave";
          delay = STAGE_DURATIONS.browse;
        }
        break;
      case "toRegister":
        nextStage = "atRegister";
        delay = STAGE_DURATIONS.toRegister;
        break;
      case "atRegister":
        // Fire sale flash
        setSaleFlash(true);
        setSaleAmount(current.revenue);
        setTimeout(() => setSaleFlash(false), 500);
        setTimeout(() => setSaleAmount(null), 1400);
        nextStage = "leave";
        delay = 600;
        break;
      case "leave":
        nextStage = "gone";
        delay = STAGE_DURATIONS.leave;
        break;
      default:
        return;
    }

    stageTimerRef.current = setTimeout(() => {
      if (nextStage === "gone") {
        setCustomer(null);
        return;
      }
      setCustomer((prev) => {
        if (!prev || prev.id !== current.id) return prev;
        const updated = { ...prev, stage: nextStage };
        // Schedule the next stage
        advanceStage(updated);
        return updated;
      });
    }, delay);
  }, []);

  // When a new customer visit arrives, start the animation
  useEffect(() => {
    if (!lastCustomerVisit || isNight) return;
    // Build a unique ID from visit data to avoid replaying the same visit
    const visitId = `${lastCustomerVisit.customerName}-${lastCustomerVisit.customerType}-${Date.now()}`;
    if (visitId === prevVisitIdRef.current) return;
    prevVisitIdRef.current = visitId;

    // Pick a random stocked shelf to visit (or shelf 0 if none stocked)
    const shelfIdx =
      stockedShelves.length > 0
        ? stockedShelves[Math.floor(Math.random() * stockedShelves.length)]
            .index
        : 0;

    const anim: CustomerAnim = {
      id: visitId,
      type: lastCustomerVisit.customerType,
      purchased: lastCustomerVisit.purchased,
      revenue: lastCustomerVisit.revenue,
      stage: "enter",
      shelfIndex: Math.min(shelfIdx, SHELF_Y.length - 1),
    };

    setCustomer(anim);
    advanceStage(anim);
  }, [lastCustomerVisit, isNight, stockedShelves, advanceStage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stageTimerRef.current) clearTimeout(stageTimerRef.current);
    };
  }, []);

  // Night overlay color
  const nightDimClass = isNight ? "opacity-50" : "";

  return (
    <section className="mb-4" aria-label="Shop visualization">
      <div
        className={`border-card-border bg-card-background relative overflow-hidden rounded-xl border ${isNight ? "border-blue-500/20" : ""}`}
        style={{ height: 200 }}
      >
        {/* 3A: Shop background — time-of-day gradient */}
        <div
          className={`absolute inset-0 transition-colors duration-2000 ${getShopBg(currentPhase)}`}
        />

        {/* 3A: Floor line */}
        <div
          className={`absolute right-0 bottom-[15%] left-0 h-px ${nightDimClass}`}
          style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
        />

        {/* 3A: Door (left side) */}
        <div
          className={`absolute rounded-t-md border border-b-0 transition-opacity ${nightDimClass}`}
          style={{
            left: "2%",
            bottom: "15%",
            width: "8%",
            height: "28%",
            borderColor: "rgba(255,255,255,0.12)",
            backgroundColor: "rgba(255,255,255,0.03)",
          }}
        >
          {/* Door knob */}
          <div
            className="absolute rounded-full"
            style={{
              right: "15%",
              top: "55%",
              width: 4,
              height: 4,
              backgroundColor: "rgba(255,255,255,0.2)",
            }}
          />
        </div>

        {/* 3A: Shelves */}
        {shelves.slice(0, 4).map((shelf, i) => {
          const pct = shelf.productId
            ? Math.min(100, (shelf.quantity / 24) * 100)
            : 0;
          return (
            <div
              key={i}
              className={`absolute transition-opacity ${nightDimClass}`}
              style={{
                left: "22%",
                right: "32%",
                top: `${SHELF_Y[i] - 2}%`,
                height: "10%",
              }}
            >
              {/* Shelf surface */}
              <div
                className="absolute inset-x-0 bottom-0 rounded-sm"
                style={{
                  height: 3,
                  backgroundColor: "rgba(255,255,255,0.08)",
                }}
              />
              {/* Stock fill bar */}
              {shelf.productId && (
                <div
                  className="absolute bottom-[3px] left-0 rounded-sm transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    height: "60%",
                    backgroundColor:
                      pct > 50
                        ? "rgba(76, 175, 80, 0.35)"
                        : pct > 20
                          ? "rgba(255, 152, 0, 0.35)"
                          : "rgba(244, 67, 54, 0.35)",
                  }}
                />
              )}
            </div>
          );
        })}

        {/* 3A: Counter / Register area (right side) */}
        <div
          className={`absolute rounded-t-sm transition-opacity ${nightDimClass} ${saleFlash ? "shop-register-flash" : ""}`}
          style={{
            right: "4%",
            bottom: "15%",
            width: "18%",
            height: "16%",
            backgroundColor: saleFlash
              ? "rgba(251, 191, 36, 0.3)"
              : "rgba(255,255,255,0.05)",
            borderTop: "2px solid rgba(255,255,255,0.1)",
            transition: "background-color 0.3s ease",
          }}
        />

        {/* 3C: Staff dots */}
        {activeStaff.slice(0, 4).map((member, i) => {
          // Station staff near shelves or counter
          const isCounter = member.role === "cashier";
          const staffX = isCounter ? REGISTER.x - 3 : 18 + i * 3;
          const staffY = isCounter
            ? REGISTER.y - 5
            : SHELF_Y[i % SHELF_Y.length] - 5;
          return (
            <div
              key={member.id}
              className={`absolute transition-opacity ${nightDimClass}`}
              style={{
                left: `${staffX}%`,
                top: `${staffY}%`,
                width: 8,
                height: 8,
                backgroundColor: STAFF_COLORS[member.role] ?? "#8888a0",
                transform: "rotate(45deg)",
                borderRadius: 2,
                transition: "left 0.5s ease, top 0.5s ease",
              }}
              title={`${member.name} (${member.role})`}
            />
          );
        })}

        {/* 3B: Customer dot */}
        {customer && !isNight && <CustomerDot customer={customer} />}

        {/* 3D: Sale revenue float */}
        {saleAmount !== null && saleAmount > 0 && (
          <span
            className="floating-indicator absolute text-xs font-bold drop-shadow-md"
            style={{
              left: `${REGISTER.x}%`,
              bottom: "45%",
              color: "var(--currency-gold)",
            }}
          >
            +{saleAmount} G
          </span>
        )}

        {/* 3E: Night overlay */}
        {isNight && (
          <div className="absolute inset-0 flex items-center justify-center bg-blue-950/40">
            <div className="flex flex-col items-center gap-1">
              <span className="text-xl" role="img" aria-label="Moon">
                &#x263D;
              </span>
              <span className="text-xs font-semibold tracking-widest text-blue-300/80">
                CLOSED
              </span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

// ── Customer Dot sub-component ────────────────────────

function CustomerDot({ customer }: { customer: CustomerAnim }) {
  const pos = getStagePosition(customer.stage, customer.shelfIndex);
  const color = CUSTOMER_COLORS[customer.type] ?? CUSTOMER_COLORS.casual;

  return (
    <div
      className="absolute z-10"
      style={{
        left: `${pos.x}%`,
        top: `${pos.y}%`,
        width: 12,
        height: 12,
        borderRadius: "50%",
        backgroundColor: color,
        boxShadow: `0 0 6px ${color}80`,
        transition: `left ${getTransitionDuration(customer.stage)}ms ease-in-out, top ${getTransitionDuration(customer.stage)}ms ease-in-out`,
        transform: "translate(-50%, -50%)",
      }}
    >
      {/* Browsing indicator: "?" bubble when not purchasing */}
      {customer.stage === "browse" && !customer.purchased && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[8px] font-bold text-white/60">
          ?
        </span>
      )}
    </div>
  );
}

function getTransitionDuration(stage: CustomerStage): number {
  switch (stage) {
    case "enter":
      return STAGE_DURATIONS.enter;
    case "browse":
      return STAGE_DURATIONS.enter;
    case "toRegister":
      return STAGE_DURATIONS.toRegister;
    case "atRegister":
      return 100;
    case "leave":
      return STAGE_DURATIONS.leave;
    default:
      return 300;
  }
}

// ── Shop background per phase ─────────────────────────

function getShopBg(phase: DayPhase): string {
  switch (phase) {
    case "morning":
      return "bg-gradient-to-b from-amber-950/20 to-transparent";
    case "afternoon":
      return "bg-gradient-to-b from-orange-950/15 to-transparent";
    case "evening":
      return "bg-gradient-to-b from-purple-950/20 to-transparent";
    case "night":
      return "bg-gradient-to-b from-blue-950/30 to-blue-950/10";
    default:
      return "";
  }
}

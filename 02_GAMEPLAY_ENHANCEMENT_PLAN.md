# 02 — Riftbound Shop: Gameplay Enhancement Plan

## Overview

This document defines the gameplay evolution of Riftbound Shop from a discrete-day simulator into a **live tycoon manager** inspired by Adventure Capitalist's management depth — without the idle/tapping mechanics.

The shop becomes **always alive**. Customers arrive, browse, and buy in real-time. The player's role is strategic: stock the right products, hire good staff, negotiate with suppliers, host events, and expand the shop into a thriving card game destination. Collecting cards and opening packs remain central — they are both a personal hobby and a business strategy.

---

## Design Principles

1. **Always Running** — The shop operates in real-time when the app is open. Revenue ticks in. Shelves deplete. Customers come and go.
2. **Planning is King** — The fun is in decisions: what to stock, who to hire, what to upgrade, which events to host, when to open packs vs. sell them.
3. **Collection is Central** — Opening packs, finding rare cards, completing sets remains a core motivator and dopamine source.
4. **Chill Pace** — No time pressure, no punishment for being away. One game-day = ~12 minutes of real time. The game rewards good planning, not fast reactions.
5. **Deep Expansion** — A single shop that grows from a small storefront into a massive multi-area destination. No prestige resets.
6. **No Loopholes** — Staff salaries, delivery delays, event cooldowns, and scaling costs prevent exploits and ensure meaningful tension throughout progression.

---

## Time Model

### Game Clock

- **1 game-day = ~12 minutes** of real time when the app is open
- **4 phases per day**: Morning (~3 min), Afternoon (~3 min), Evening (~3 min), Night (~3 min)
  - **Morning**: Lower traffic, casual/kid customers predominate
  - **Afternoon**: Peak traffic, mixed customer types
  - **Evening**: Collector and competitive customers, premium sales
  - **Night**: Shop closes. Daily summary screen. Planning phase — restock, upgrade, manage staff, plan events
- **Customer arrival rate**: 1 customer every ~15-60 seconds depending on traffic stats (shop level, reputation, marketing upgrades, events, hype)
- **Day counter** increments automatically at each night phase transition

### Offline Behavior

- When the app is closed, the simulation runs at **60% efficiency** (capped at **8 hours**)
- Offline simulation covers: shelf sales, staff actions (auto-restock, auto-order), payroll deduction, hype decay, day advancement
- Offline simulation does NOT cover: pack opening, trading, event hosting, supplier browsing
- On return, player sees an **Away Report**: revenue earned, items sold, shelves depleted, staff actions taken, days passed

### UI Model

- **Stats-based display** (no animated customer sprites): running gold counter, notification feed ("Customer bought Origins Booster! +160G"), shelf stock gauges, customer count indicator, day/night phase indicator
- Clean, info-dense, mobile-friendly layout

---

## System-by-System Changes

### What's Changing

| System      | Before                                 | After                                                 | Impact                    |
| ----------- | -------------------------------------- | ----------------------------------------------------- | ------------------------- |
| Time        | Discrete "End Day" button              | Real-time simulation with day/night cycle             | Game feels alive          |
| Shop        | 2-5 flat shelves + display case        | 8 distinct areas to unlock and upgrade                | Deep spatial progression  |
| Staff       | None (player does everything)          | 6 staff roles with leveling, salary, morale           | Management layer          |
| Suppliers   | Single supplier, fixed prices, instant | 4 suppliers with delivery times, relationships, deals | Strategic restocking      |
| Events      | Random, passive, uncontrollable        | Player-planned events with costs and requirements     | Strategic tool            |
| Upgrades    | 8 flat upgrades, easily maxed          | 30+ upgrades with branching specialization            | Lasts entire game         |
| Missions    | 8 repetitive types                     | 15+ types leveraging all new systems                  | Always something to chase |
| Progression | Level 1-20, linear                     | Reputation tiers, set bonuses, shop milestones        | Layered long-term goals   |

---

## New System Designs

### 1. Shop Areas

The shop grows from a small storefront into a multi-area destination. Each area is a distinct revenue stream and gameplay space.

| Area                | Unlock Level | Function                                                            | Revenue Model                  |
| ------------------- | ------------ | ------------------------------------------------------------------- | ------------------------------ |
| **Sales Floor**     | Start        | Booster shelves, starter decks. Bread and butter.                   | Per-item sales                 |
| **Singles Counter** | L3 (exists)  | List individual cards for sale. High margins on rares.              | Per-card sales                 |
| **Storage Room**    | L2 (exists)  | Inventory capacity. Expand for bulk buying.                         | Enables other areas            |
| **Tournament Hall** | L6           | Host tournaments. Attracts competitive players, boosts hype.        | Entry fees + sales spike       |
| **Lounge**          | L8           | Casual hangout. Increases customer dwell time.                      | Passive income (drinks/snacks) |
| **Premium Vault**   | L12          | Display showcase/epic/rare cards at premium prices. Whale magnet.   | High-margin singles            |
| **Workshop**        | L15          | Card grading, sleeves, accessories. New product category.           | Accessory sales                |
| **Online Store**    | L18          | Sell to "online customers" — global reach, different customer pool. | Remote sales channel           |

**Each area has:**

- **Build cost** (one-time gold payment)
- **3 upgrade tiers** (bigger, better, more capacity)
- **Staff slots** (needs employees to operate efficiently)
- **Unique customer interactions** (customers route to areas based on type/preference)

### 2. Staff System

Hire, manage, and level up employees. Staff are the key to scaling.

| Role                 | Function                                                                      | Assigned To                    |
| -------------------- | ----------------------------------------------------------------------------- | ------------------------------ |
| **Cashier**          | Speeds up customer checkout. More cashiers = handle more customers per cycle. | Sales Floor                    |
| **Stocker**          | Auto-restocks shelves from inventory when stock runs low.                     | Sales Floor, Premium Vault     |
| **Buyer**            | Auto-orders from suppliers when inventory drops below configurable threshold. | Storage Room                   |
| **Card Specialist**  | Manages singles listings, auto-prices based on market. Handles Premium Vault. | Singles Counter, Premium Vault |
| **Tournament Judge** | Required to host tournaments. Better judges = bigger events.                  | Tournament Hall                |
| **Barista**          | Runs the lounge. Higher level = more passive income.                          | Lounge                         |

**Staff Mechanics:**

- **Hiring pool**: 3-5 candidates available, refreshes daily. Each has randomized stats (speed, skill, charisma) and a salary demand.
- **Leveling**: Staff gain XP from working their shift. Level up = better performance. Level-up notification shown to player.
- **Salary**: Deducted from revenue automatically at end of each day. Must maintain positive cash flow.
- **Morale (0-100)**: Starts at 70. Overworked or underpaid staff lose morale → reduced performance. Give raises, bonuses to improve morale. Below 30 morale = staff may quit.
- **Max staff slots**: Scales with shop level (1 at L1, 2 at L3, 3 at L5, 4 at L8, 5 at L10, 6 at L13, 7 at L15, 8 at L17, 9 at L19, 10 at L20).

### 3. Supplier System

Multiple suppliers with different strategies. Restocking becomes an active decision.

| Supplier                  | Specialty                                           | Price Modifier  | Delivery Time | Unlock |
| ------------------------- | --------------------------------------------------- | --------------- | ------------- | ------ |
| **MainLine Distributors** | All standard products, reliable stock               | 1.0x (standard) | Instant       | Start  |
| **BulkDeal Co.**          | Bulk orders only (min 10 units)                     | 0.75–0.85x      | 1-2 game-days | L4     |
| **RareFinders**           | Out-of-print products, exclusive items, promo packs | 1.2–1.5x        | 1-3 game-days | L8     |
| **Flash Sales**           | Random daily deals, limited quantities              | 0.5–0.7x        | Instant       | L6     |

**Supplier Mechanics:**

- **Relationship levels (1-5)**: Buy more from a supplier → earn relationship XP → unlock better prices and exclusive products at each tier.
- **Bulk discounts**: Order 10+ = 5% off, 20+ = 10% off, 50+ = 15% off (BulkDeal only).
- **Delivery queue**: Orders placed show in a delivery tracker. Arrive after delay. Notification on delivery.
- **Flash Sales**: 3 random deals refresh each morning. Limited to 5-20 units per deal. First come first served.
- **Exclusive products**: RareFinders at relationship L3+ offers promo packs, sealed product, limited editions.
- **Buyer staff integration**: Buyer staff auto-orders from the player's preferred supplier when inventory drops below a configurable threshold.

### 4. Event Planning

The player becomes an event organizer. Events are a strategic tool, not random noise.

| Event                    | Cost                               | Duration | Requirements                               | Effects                                                                |
| ------------------------ | ---------------------------------- | -------- | ------------------------------------------ | ---------------------------------------------------------------------- |
| **Local Tournament**     | 2,000G                             | 1 day    | Tournament Hall, Judge staff               | +60% competitive customers, +15 hype to featured set, reputation boost |
| **Pack Opening Night**   | 1,000G                             | 1 day    | Sales Floor T2+                            | +40% collector traffic, +25% booster sales                             |
| **New Set Launch Party** | 5,000G                             | 1 day    | Sales Floor T3+, 50+ units of set in stock | +100% traffic for that set, +30 hype, huge revenue spike               |
| **Clearance Sale**       | Revenue loss (forced 30% discount) | 1 day    | None                                       | Move old stock, attract budget customers, free shelf space             |
| **VIP Night**            | 3,000G                             | 1 day    | Premium Vault                              | Only whales + collectors, +50% price tolerance, premium atmosphere     |
| **Community Game Night** | 500G                               | 1 day    | Lounge                                     | Low direct revenue, +20 reputation, builds regular customer base       |

**Event Mechanics:**

- **Preparation time**: Events need 1-3 days of planning before they fire. Player schedules in advance.
- **Requirement checks**: Some events need specific areas built and specific staff hired. Game shows checklist.
- **Cooldowns**: Same event type cannot be repeated within 3-5 days. Different events can overlap if requirements are met.
- **Event calendar UI**: See upcoming planned events, available event types, requirements checklist.
- **Results screen**: After event completes — attendance, revenue generated, reputation change, hype impact, any special rewards.
- **Random "community events"**: The existing 9 event types still occur randomly as external happenings (tournaments elsewhere, influencer visits, etc.). Player events stack with community events.

### 5. Deep Upgrade Tree

Expand from 8 flat upgrades to 30+ with branching specialization.

#### Infrastructure (10 upgrades)

| Upgrade              | Levels | Effect                                                         | Prerequisite      |
| -------------------- | ------ | -------------------------------------------------------------- | ----------------- |
| Extra Shelf          | 3      | +1 shelf slot per level                                        | —                 |
| Premium Lighting     | 3      | +X% impulse buy chance                                         | —                 |
| AC / Climate Control | 3      | +X% customer dwell time                                        | —                 |
| Security System      | 3      | Prevents theft events, +reputation                             | L5                |
| POS System           | 3      | Faster checkout (more customers/cycle)                         | L3                |
| Free WiFi            | 2      | +customer dwell time, prerequisite for Online Store            | L7                |
| Parking Space        | 3      | +X% walk-in traffic                                            | L6                |
| Premium Storefront   | 3      | +X% traffic from signage                                       | Better Signage L2 |
| Floor Expansion      | 4      | Prerequisite for new areas                                     | L4                |
| Back Office          | 2      | +staff management efficiency (faster leveling, cheaper hiring) | L8                |

#### Marketing (6 upgrades)

| Upgrade               | Levels | Effect                                          | Prerequisite       |
| --------------------- | ------ | ----------------------------------------------- | ------------------ |
| Better Signage        | 5      | +X% traffic bonus                               | —                  |
| Social Media Presence | 3      | +X% passive traffic boost                       | L5                 |
| Local Advertising     | 3      | +X% targeted customer type boost (configurable) | L6                 |
| Loyalty Program       | 3      | +X% repeat customer rate                        | L2                 |
| Sponsorship Deals     | 2      | Passive income from partnerships                | L12                |
| Community Reputation  | 3      | +organic word-of-mouth traffic                  | Loyalty Program L2 |

#### Operations (8 upgrades)

| Upgrade                     | Levels | Effect                                                          | Prerequisite  |
| --------------------------- | ------ | --------------------------------------------------------------- | ------------- |
| Stock Room Expansion        | 4      | +X inventory capacity                                           | —             |
| Supplier Contacts           | 3      | -X% wholesale cost at MainLine                                  | —             |
| Inventory Management System | 3      | Auto-tracking, reorder alerts, stock analytics                  | L4            |
| Training Manual             | 3      | +X% customer tolerance                                          | L2            |
| Staff Training Program      | 3      | +X% staff XP gain rate                                          | L6            |
| Bulk Storage                | 3      | +X extra capacity for bulk orders                               | Stock Room L2 |
| Price Analytics             | 2      | See optimal markup suggestions, demand forecasting              | L8            |
| Automation Suite            | 3      | Various QoL: auto-list singles, auto-price, auto-restock alerts | L10           |

#### Specialization (3 branches, choose 1 at L10 — 4 upgrades each)

**Branch A — Competitive Hub**

| Upgrade               | Levels | Effect                                                |
| --------------------- | ------ | ----------------------------------------------------- |
| Tournament Prize Pool | 3      | Better tournaments → more attendance → more revenue   |
| Ranked Event System   | 2      | Host ranked tournaments, attract top players          |
| Meta Board            | 2      | Display trending cards, +competitive customer traffic |
| Sponsorship Revenue   | 3      | Earn passive income from tournament sponsorships      |

**Branch B — Collector's Paradise**

| Upgrade                 | Levels | Effect                                                 |
| ----------------------- | ------ | ------------------------------------------------------ |
| Card Grading Service    | 3      | Grade cards for premium value (+X% singles price)      |
| Premium Display Quality | 3      | Display case attracts more whales, +showcase appeal    |
| Rare Card Finder        | 2      | Suppliers occasionally offer rare out-of-print singles |
| Collection Bonuses      | 3      | Enhanced set completion rewards                        |

**Branch C — Volume Dealer**

| Upgrade           | Levels | Effect                                                 |
| ----------------- | ------ | ------------------------------------------------------ |
| Express Checkout  | 3      | Handle X% more customers per cycle                     |
| Mega Shelves      | 3      | Each shelf holds X more product                        |
| Wholesale Mastery | 3      | Further supplier discounts, better bulk pricing        |
| Chain Efficiency  | 2      | Online Store revenue bonus, multi-channel optimization |

### 6. Enhanced Progression

#### New Mission Types (15+ total)

Existing types retained plus new ones leveraging all systems:

- `host_tournament` — Host X tournaments
- `hire_staff` — Hire X staff members
- `level_staff` — Level up a staff member to X
- `build_area` — Build X shop areas
- `upgrade_area` — Upgrade an area to tier X
- `supplier_relationship` — Reach relationship level X with any supplier
- `plan_event` — Plan and execute X events
- `flash_deal` — Buy X Flash Sale deals
- `premium_sale` — Sell X items from Premium Vault
- `daily_revenue` — Earn X gold in a single day
- `staff_payroll` — Pay X total in staff salaries (shows you're scaling)

#### Reputation Tiers

| Tier                         | Requirement      | Bonus                                                                |
| ---------------------------- | ---------------- | -------------------------------------------------------------------- |
| **Unknown Shop**             | Start            | —                                                                    |
| **Local Favorite**           | 200 reputation   | +5% traffic                                                          |
| **Neighborhood Destination** | 500 reputation   | +10% traffic, +5% price tolerance                                    |
| **City Hotspot**             | 1,000 reputation | +15% traffic, +10% price tolerance, unlock Sponsorship Deals upgrade |
| **Regional Landmark**        | 2,500 reputation | +20% traffic, +15% price tolerance, Premium Vault capacity bonus     |
| **National Icon**            | 5,000 reputation | +30% traffic, +20% price tolerance, unique cosmetic rewards          |

#### Collection Set Bonuses

Completing 100% of a set grants a permanent shop bonus:

- **Proving Grounds (OGS)**: +5% all XP gains permanently
- **Origins (OGN)**: +5% collector customer traffic permanently
- **Spiritforged (SFD)**: +5% competitive customer traffic permanently

#### Shop Milestones

One-time achievement rewards:

- First 1,000G day → Unlock decorative banner
- First 10,000G day → +5 max inventory capacity
- First tournament hosted → Unlock Tournament Judge hiring
- First staff hired → +1 staff slot permanently
- First supplier relationship L3 → Unlock exclusive product line
- First area built → Reputation boost (+50)
- All areas built → Massive reputation boost (+500)
- First set completed → +10% pack opening XP

---

## Balance Safeguards (Anti-Exploit)

| Exploit Vector                | Safeguard                                                                                                   |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Infinite scaling via staff    | Staff salaries create ongoing expenses. More staff = higher payroll = need more revenue to stay profitable. |
| Perfect timing with suppliers | Delivery delays prevent "buy right before the rush" exploits. Flash Sales are limited quantity.             |
| Event spamming                | Cooldowns (3-5 days per event type). Events cost gold and require staff/areas.                              |
| Offline farming               | 60% efficiency cap, 8-hour maximum. No pack opening, trading, or events offline.                            |
| Upgrade rush                  | Exponential cost scaling. Prerequisites create natural gates. Specialization forces tradeoffs.              |
| Price exploitation            | Customer tolerance is capped. Hype decays naturally. Market conditions shift.                               |
| Hoarding stock                | Inventory capacity is limited. Storage Room upgrades are expensive. Stock takes up capital.                 |

---

## Pacing Guide

### Early Game (L1–L5) — "The Startup" (~1-2 hours)

- Learn basics: stock shelves, set prices, sell to customers
- Open first packs, start collection
- Buy first upgrades (Extra Shelf, Better Signage)
- Unlock Singles Counter (L3), hire first employee (L3)
- Unlock BulkDeal supplier (L4)
- Frequent level-ups, constant unlocks
- **Feel**: Exciting discovery, rapid growth

### Mid Game (L6–L12) — "Growing the Business" (~4-8 hours)

- Build Tournament Hall (L6), host first tournament
- Unlock Flash Sales supplier (L6)
- Build Lounge (L8), hire barista
- Unlock RareFinders supplier (L8)
- Choose specialization branch at L10
- Build Premium Vault (L12)
- Staff management becomes important (payroll, morale)
- Supplier relationships start paying off
- **Feel**: Strategic depth, meaningful decisions, identity forming

### Late Game (L13–L20) — "The Destination" (~8-15 hours)

- Build Workshop (L15), Online Store (L18)
- Max out specialization branch
- Host advanced events (VIP Night, Launch Party)
- Chase set completion bonuses
- Reach top reputation tiers
- Optimize revenue across all areas
- **Feel**: Mastery, optimization, completionist satisfaction

---

## Technical Architecture Notes

### Simulation Engine

- **Tick rate**: Every 1 second, check for customer arrival (probability-based, not guaranteed)
- **Customer arrival probability per tick**: `baseRate × trafficMultipliers / ticksPerMinute`
- **Day phase transitions**: Automatic, based on elapsed game-time
- **Night phase**: Pauses customer simulation, shows summary, enables planning UI
- **Offline calculation**: On app open, calculate `elapsedRealTime`, convert to `gameTime`, simulate at 60% efficiency, cap at 8h real time

### State Management

- Game store (Zustand) gains: `areas`, `staff`, `suppliers`, `deliveryQueue`, `plannedEvents`, `upgradeTree`, `reputationTier`
- Tick state: `lastTickTimestamp`, `currentPhase`, `dayProgress`
- All new engine modules follow existing pattern: **pure functions, no side effects, no React, no store access**

### New Engine Modules

```
src/features/engine/
  simulation.ts     — tick-based simulation loop, customer arrival, phase transitions
  areas.ts          — area building, upgrading, effects
  staff.ts          — hiring, leveling, payroll, morale
  suppliers.ts      — multi-supplier catalog, ordering, delivery, relationships
  event-planner.ts  — player-initiated events, requirements, cooldowns, results
  upgrade-tree.ts   — 30+ upgrades with prerequisites, categories, specialization
  reputation.ts     — reputation tiers, bonuses
```

### Save Migration

- All new fields added with defaults for backward compatibility
- Existing progress (level, gold, collection, upgrades) fully preserved
- Existing 8 upgrades mapped into the new tree
- `endDay`-based saves converted to new time model (current day preserved, clock reset)

---

## Implementation Milestones

### M13 — Real-Time Simulation Engine

> Core architecture shift. Everything else depends on this.

- [x] 13.1 Design time system: game clock, tick rate, day/night phases (~3 min each at 12 min/day)
- [x] 13.2 Create `simulation.ts` engine: tick-based customer arrival, real-time shelf depletion, revenue accumulation
- [x] 13.3 Implement day phase system: morning/afternoon/evening/night transitions with different customer profiles per phase
- [x] 13.4 Replace End Day flow: remove manual `endDay` action, implement automatic day transitions
- [x] 13.5 Build night phase: daily summary screen, planning mode (restock, upgrade, manage during night)
- [x] 13.6 Build offline catch-up engine: calculate elapsed real time, simulate game-days at 60% efficiency, generate Away Report
- [x] 13.7 Update game store: remove `endDay` action, add tick-based state updates, `lastTickTimestamp`, `currentPhase`, `dayProgress`
- [x] 13.8 Build live shop dashboard: running revenue counter, customer notification feed, shelf stock gauges, phase indicator
- [x] 13.9 Migrate existing customer simulation to tick-based arrival (preserve all 5 types, budgets, tolerances)
- [x] 13.10 Wire existing systems into new time model: hype decay per day, mission evaluation per day, random events per day
- [x] 13.11 Save migration: backward-compatible format, preserve all existing progress
- [x] 13.12 Typecheck + build + manual testing pass

### M14 — Shop Areas & Expansion

> Transform the shop from flat shelves to multi-area business.

- [x] 14.1 Design area data model: `ShopArea { id, type, tier, staffSlots, isBuilt, upgradeTier }`
- [x] 14.2 Create area definitions JSON: 8 areas with costs, unlock levels, tier upgrades, capacity, effects
- [x] 14.3 Build `areas.ts` engine: buildArea, upgradeArea, getAreaEffects, calculateAreaRevenue
- [x] 14.4 Refactor existing shelves into Sales Floor area (backward compatible, no player-facing regression)
- [x] 14.5 Refactor existing Singles Counter into area-based system
- [x] 14.6 Refactor existing Storage Room into area with expansion tiers
- [x] 14.7 Implement Tournament Hall area: tournament hosting capability, competitive customer routing
- [x] 14.8 Implement Lounge area: passive income generation, customer dwell time bonus
- [x] 14.9 Implement Premium Vault area: high-value singles display, whale customer routing
- [x] 14.10 Implement Workshop area: accessories/grading product category
- [x] 14.11 Implement Online Store area: remote customer pool, separate traffic calculation
- [x] 14.12 Build Shop Areas UI: area overview hub, area detail pages, build/upgrade buttons, tier indicators
- [x] 14.13 Wire area effects into simulation engine: area-specific customer routing, area-specific revenue
- [x] 14.14 Update navigation: Shop page becomes area hub with sub-navigation
- [x] 14.15 Save migration + typecheck + build

### M15 — Staff System

> Hire, manage, and level up employees.

- [x] 15.1 Design staff data model: `StaffMember { id, name, role, level, xp, salary, morale, assignedAreaId, hiredDay }`
- [x] 15.2 Create staff role definitions: 6 roles with base stats, salary ranges, XP curves, per-level bonuses
- [x] 15.3 Build `staff.ts` engine: generateCandidates, hireStaff, fireStaff, assignToArea, calculatePayroll, updateMorale, levelUpStaff
- [x] 15.4 Implement hiring pool: 3-5 daily candidates with randomized stats and salary demands, daily refresh
- [x] 15.5 Wire staff effects into simulation: cashier checkout speed, stocker auto-restock, buyer auto-order triggers
- [x] 15.6 Implement payroll system: daily salary deduction at night phase, negative cash flow warning, insufficient funds handling
- [x] 15.7 Implement morale system: work hours affect morale, underpay penalty, raise/bonus mechanics, quit threshold at 30
- [x] 15.8 Implement staff leveling: XP from working, level-up stat improvements, level-up notification
- [x] 15.9 Build Staff Management UI: staff roster page, hiring page (candidate cards with stats), assignment page, staff detail view
- [x] 15.10 Staff slot scaling: max slots increase with shop level (1→10 across L1→L20)
- [x] 15.11 Name generation: random name pool for staff candidates
- [x] 15.12 Save migration + typecheck + build

### M16 — Supplier System (SKIPPED)

> Multiple suppliers with different strategies.
>
> **Skipped**: The existing single-supplier instant-purchase system is sufficient for the chill tycoon experience. Wholesale discounts already come from upgrades, staff, and events. May revisit post-M19 if more depth is needed.

- [~] 16.1 Design supplier data model: `Supplier { id, name, catalog, priceModifier, deliveryTime, relationshipLevel, relationshipXP }`
- [~] 16.2 Create 4 supplier definitions with catalogs, pricing rules, delivery mechanics, relationship tiers
- [~] 16.3 Build `suppliers.ts` engine: getAvailableProducts, calculatePrice, placeOrder, processDeliveries, updateRelationship
- [~] 16.4 Implement delivery queue: order placed → in transit (X days) → delivered notification → added to inventory
- [~] 16.5 Implement supplier relationships: purchase volume → relationship XP → tier up → better prices/exclusive access
- [~] 16.6 Implement Flash Sales system: 3 daily deals, limited quantities, randomized from product pool, morning refresh
- [~] 16.7 Implement bulk discount tiers for BulkDeal: 10+ = 5%, 20+ = 10%, 50+ = 15%
- [~] 16.8 Wire Buyer staff into supplier system: auto-order when inventory < threshold, uses player's preferred supplier
- [~] 16.9 Refactor supplier page: multi-supplier tabs, order history, delivery tracker, relationship progress bars
- [~] 16.10 Save migration + typecheck + build

### M17 — Event Planning

> Player-initiated events that drive traffic and revenue.

- [x] 17.1 Design event planning data model: `PlannedEvent { type, scheduledDay, prepDaysLeft, cost, status }`
- [x] 17.2 Create 6 player event type definitions with costs, requirements, effects, cooldowns, prep times
- [x] 17.3 Build `event-planner.ts` engine: planEvent, checkRequirements, advancePreparation, executeEvent, calculateResults
- [x] 17.4 Implement requirement validation: area checks, staff checks, inventory checks, gold checks
- [x] 17.5 Implement preparation phase: 1-3 day countdown before event fires, visual prep indicator
- [x] 17.6 Implement event execution: modified customer arrival rates, changed customer type weights, tolerance changes during event
- [x] 17.7 Implement event results: attendance, revenue delta, reputation gain, hype impact, special reward drops
- [x] 17.8 Implement cooldown system: per-event-type cooldown (3-5 days), cooldown tracker
- [x] 17.9 Build Event Planning UI: event list view, available events list with requirement checklist, plan button, active event indicator, results summary
- [x] 17.10 Preserve existing random events as "community events" that stack with player events
- [x] 17.11 Save migration + typecheck + build

### M18 — Deep Upgrade Tree (Simplified)

> Expanded from 8 to 20 upgrades in 3 categories with prerequisite chains. Simplified per user request — no specialization branches, only 3 new easy-to-wire effect types.

- [x] 18.1 Update types: add `passive_income`, `hype_decay_reduction`, `event_revenue_bonus` to `UpgradeEffectType`; add `prerequisites?: string[]` to `UpgradeDefinition`; change `UpgradeCategory` to 3 categories (operations, customer_experience, business)
- [x] 18.2 Expand upgrade catalog from 8 → 20 upgrades across 3 categories with prerequisite chains; add `passiveIncome`, `hypeDecayReduction`, `eventRevenueBonus` to `UpgradeModifiers` and `getUpgradeModifiers`
- [x] 18.3 Add `arePrerequisitesMet()` function; update `canPurchaseUpgrade` with optional `ownedUpgrades` param for prerequisite validation
- [x] 18.4 Update `game-store.ts` `purchaseUpgrade` to pass `ownedUpgrades` to `canPurchaseUpgrade`
- [x] 18.5 Wire new effects into `advanceDay`: upgrade passive income added to softCurrency alongside area passive income, hype decay reduction passed to `decayHype()`, event revenue bonus applied as gold bonus from completed player events; offline progress includes upgrade passive income
- [x] 18.6 Rebuild Upgrades UI with 3 category tabs, prerequisite lock indicators, new effect descriptions in bonus summary
- [x] 18.7 No save migration needed — same `UpgradeState[]` format, new upgrade IDs return 0 from `getOwnedLevel`
- [x] 18.8 Typecheck + build clean

### M19 — Enhanced Progression & Polish (Simplified)

> Tie everything together with polish and reputation tiers. Collection set bonuses and tutorial/onboarding removed (simplified per user request).

- [x] 19.1 New mission types + milestones: 5 new MissionType values (`hire_staff`, `build_area`, `sell_singles`, `complete_trades`, `buy_upgrades`) and 10 new milestone missions, plus new daily/weekly templates
- [x] 19.2 Reputation tier system: 6 tiers (Unknown→Legendary) with thresholds and cumulative bonuses (+traffic, +tolerance, +rep/day, +passive income, +XP). Pure engine module `reputation.ts`. Wired into `advanceDay()` and `calculateOfflineProgress()`
- [x] 19.3 Night summary polish: running averages in ShopStats (`totalDaysPlayed`, `bestDayRevenue`, `bestDayProfit`), enhanced EndDayModal with singles revenue, rep change, staff payroll, passive income, "vs avg" comparison, reputation tier display. Wired orphaned EndDayModal into page.tsx
- [x] 19.4 Away Report polish: extended OfflineReport with `singlesRevenue`, `singlesSold`, `passiveIncome`, `reputationGained`; surfaced in offline report banner
- [x] 19.5 Economy balance pass: reviewed milestone rewards, rep tier bonuses, progression timeline — all in line, no changes needed
- [x] 19.6 Save migration: step 3i in auth-provider.tsx for new ShopStats fields with backward-compatible defaults
- [x] 19.7 Typecheck + build clean, committed and pushed

---

## Milestone Dependencies

```
M13 (Real-Time Simulation) ✅
 ├── M14 (Shop Areas) ✅
 │    └── M18 (Upgrade Tree) ── depends on M14
 ├── M15 (Staff System) ✅
 │    └── M17 (Events) ✅ ── depends on M14 + M15
 ├── M16 (Suppliers) ~SKIPPED~
  └── M19 (Progression) ✅    ── depends on all above
```

M15 (Staff) and M16 (Suppliers) can be developed in parallel after M13.
M16 was skipped — existing single-supplier system is sufficient.
M17 (Events) needs both M14 (areas as requirements) and M15 (staff as requirements).
M18 (Upgrade Tree) can start after M14 (new areas need upgrade integration).
M19 (Progression) is the final integration pass after all systems exist.

---

## Implementation Log

_(Updated as milestones are completed)_

- _(No entries yet — implementation begins with M13)_

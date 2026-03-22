# Visual & Feel Revamp Plan

> Make the game feel alive. Replace the spreadsheet-with-styling experience with
> something tactile, responsive, and rewarding. Every interaction should give feedback.
> Every milestone should feel earned.

---

## Phase 1: Juice & Micro-feedback (Foundation)

Low-effort, high-feel improvements that touch existing components. Sets the visual
language for everything after.

| #   | Feature                          | Description                                                                                                                                                                                                                      | Status |
| --- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 1A  | **Animated Gold Counter**        | Reusable component that smoothly counts up/down between values (slot-machine ticker). Applied to balance, revenue, XP, reputation. Uses `requestAnimationFrame` interpolation. Duration proportional to delta, capped at ~800ms. | `[x]`  |
| 1B  | **Floating Sale Indicators**     | "+25 G" labels float upward and fade out on each sale. Triggered by `sale` notifications. Max ~5 concurrent. Anchored on home page near stat cards.                                                                              | `[x]`  |
| 1C  | **Time-of-Day Atmosphere**       | Subtle background gradient shift on home page per day phase. Morning=warm amber, Afternoon=golden, Evening=sunset purple, Night=cool blue. Smooth 2s CSS transition.                                                             | `[x]`  |
| 1D  | **Number Change Flash**          | When stat values change, briefly highlight green (increase) or red (decrease). 200ms background glow then fade. Applied to stat cards.                                                                                           | `[x]`  |
| 1E  | **Progress Bar Fill Animations** | XP bar, shelf stock gauges, mission progress bars animate from 0 to current value on mount. Framer Motion or CSS `@starting-style`.                                                                                              | `[x]`  |

**New files:**

- `src/components/ui/animated-counter.tsx`
- `src/components/ui/floating-indicator.tsx`

**Edited files:**

- `src/app/globals.css` — phase atmosphere variables, flash utilities
- `src/app/page.tsx` — integrate counter, floaters, atmosphere, flash
- `src/lib/animations.ts` — new variants for floaters and bar fills

---

## Phase 2: Pack Opening Revamp

Full-screen card reveal with tap-to-advance and summary at the end.

| #   | Feature                          | Description                                                                                                                                                                                  | Status |
| --- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 2A  | **Full-Screen Card Reveal**      | Card fills ~70% of screen width, centered vertically. Card back shown first, 3D flip reveals front. Card details (name, rarity, set, type) appear below after flip. Tap anywhere to advance. | `[x]`  |
| 2B  | **Rarity-Specific Enhancements** | Common/Uncommon: standard flip. Rare: blue energy burst behind card. Epic: purple screen flash + particle dots. Showcase: gold/rainbow sweep, shimmer overlay, 500ms hold before tap.        | `[x]`  |
| 2C  | **Card Reveal Counter**          | Small pill at top "3 / 8" with mini progress bar. "NEW" badge with bounce-in + sparkle effect.                                                                                               | `[x]`  |
| 2D  | **Summary Screen**               | After last card tap, transition to summary grid. All cards in 3-4 column grid with stagger entrance. Names, rarity borders, NEW badges. Stats: "X new, Y dupes". Done button.                | `[x]`  |
| 2E  | **Batch Open (5x) Revision**     | Same full-screen flip sequence but faster (0.4s flip). Auto-advances every 1.2s, tap to skip ahead. "Skip to Summary" button. Epic+ cards pause even in auto-advance. Summary at end.        | `[x]`  |

**Edited files:**

- `src/app/packs/page.tsx` — full rewrite of reveal states
- `src/lib/animations.ts` — new reveal variants
- `src/app/globals.css` — rarity burst/flash CSS animations

---

## Phase 3: The Living Shop View

The centerpiece. A minimal geometric shop visualization on the home page.

| #   | Feature                        | Description                                                                                                                                                                                                     | Status |
| --- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 3A  | **Shop View Component**        | Compact (200-240px) visual shop. CSS shapes: rounded rect background with time-of-day gradient, horizontal shelf rectangles filled proportionally, counter/register area, door on left.                         | `[x]`  |
| 3B  | **Customer Animation**         | Customer dots (12-16px colored circles by type: casual=blue, collector=purple, competitive=red, kid=green, whale=gold). Enter from door, move to shelf, buy (coin particle) or leave (? bubble). One at a time. | `[x]`  |
| 3C  | **Staff Presence**             | Staff dots (squares/diamonds) stationed near shelves. Color-coded by role. Static placement.                                                                                                                    | `[x]`  |
| 3D  | **Sale Flash + Revenue Float** | Register area flashes gold on sale. "+N G" floats up from register (reuses floating-indicator).                                                                                                                 | `[x]`  |
| 3E  | **Night Mode**                 | Shop dims during night phase. "CLOSED" text overlay. No customer dots. Moon/star icon on register.                                                                                                              | `[x]`  |
| 3F  | **Home Page Integration**      | Insert between Day Phase Indicator and stat cards. Shelf stock gauges simplified (shop view shows stock visually).                                                                                              | `[x]`  |

**New files:**

- `src/components/ui/shop-view.tsx`

**Edited files:**

- `src/app/page.tsx` — insert shop view, adjust layout
- `src/stores/game-store.ts` — add `lastCustomerVisit` transient field
- `src/hooks/useSimulation.ts` — populate `lastCustomerVisit` on tick

---

## Phase 4: Big Moment Celebrations

Reward the player emotionally at key milestones.

| #   | Feature                     | Description                                                                                                                                                            | Status |
| --- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 4A  | **Level-Up Celebration**    | On level-up in end-day modal: level number scales up with `levelUpPulse`, gold coin particles rain (8-12 falling circles), new unlocks listed. Auto-dismiss 3s or tap. | `[x]`  |
| 4B  | **Mission Claim Animation** | Reward icon flies from claim button to header balance. Curved path via Framer Motion keyframes.                                                                        | `[x]`  |
| 4C  | **Day-End Stat Stamps**     | Stat rows in end-day modal "stamp" with scale overshoot (1.0 -> 1.05 -> 1.0). Profit row: green glow if positive, red flash if negative.                               | `[x]`  |
| 4D  | **Prestige Ceremony**       | Full-screen: shop fades to white, prestige badge animates in (spring scale), bonuses stagger in, "Your new journey begins..." text, fade back.                         | `[x]`  |

**Edited files:**

- `src/components/ui/end-day-modal.tsx` — level-up particles, stat stamps
- `src/app/more/missions/page.tsx` — claim fly animation
- `src/app/more/prestige/page.tsx` — prestige ceremony
- `src/lib/animations.ts` — new celebration variants

---

## Implementation Order

1. **Phase 1** — Foundation juice (do first, every phase benefits)
2. **Phase 2** — Pack opening revamp (standalone, high-impact moment)
3. **Phase 3** — Living shop view (largest feature, depends on Phase 1 atmosphere)
4. **Phase 4** — Celebrations (polish layer, builds on everything above)

Each phase is committed and pushed independently.

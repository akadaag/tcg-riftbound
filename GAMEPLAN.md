# Riftbound Shop — Game Enhancement Plan

Structured improvement plan to transform the daily loop from "watch numbers go up" into a game with daily decisions, meaningful progression, and late-game staying power. Inspired by Lemonade Tycoon's addictive "one more day" design.

---

## Tier A: Quick Wins (Immediate Impact)

| #   | Feature                           | Why                                                                                                                                                         | Status |
| --- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| A1  | **Onboarding banners**            | New players need guidance on first actions (buy stock, stock shelves, set markup). Show dismissible contextual hints on the home page for Day 1-3 players.  | `[x]`  |
| A2  | **Traffic tuning (5 -> 8 at L1)** | Early game feels dead with only 5 customers/day. Bump L1-L3 base traffic so new players see activity faster. L1: 8, L2: 10, L3: 13.                         | `[x]`  |
| A3  | **Level-up reward popup**         | Leveling up feels invisible. Show a celebratory modal with a gold bonus (50-200G scaling with level) on each level-up. Make progression tangible.           | `[x]`  |
| A4  | **Stock-out reputation penalty**  | No consequences for empty shelves. If ALL shelves are empty when a customer visits, lose 1 reputation. Creates restocking urgency and a reason to check in. | `[x]`  |

---

## Tier B: Daily Decision Loop (The Big Missing Piece)

| #   | Feature                            | Why                                                                                                                                                                                                                                                                                                       | Status |
| --- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| B1  | **Market Trends**                  | Each morning, show 1-2 daily modifiers: "Collectors browsing (+20% collector traffic)", "Budget shoppers (-10% tolerance)", "Origins set trending (+15% hype)". This is the "weather" equivalent — gives the player a reason to adjust markup and featured products daily. Pure data from day-seeded RNG. | `[x]`  |
| B2  | **Restock notification + urgency** | When a shelf drops below 3 units, show a pulsing indicator. When a shelf empties mid-day, show "Lost sale — shelf empty!" in the live feed. Make the player feel the cost of not restocking.                                                                                                              | `[x]`  |
| B3  | **Price sensitivity feedback**     | After each customer visit, show whether they thought the price was "fair", "a bit high", or "too expensive" in the live feed. This teaches players about the markup system naturally.                                                                                                                     | `[x]`  |

---

## Tier C: Late-Game Content (Fill the Dead Spots)

| #   | Feature                                   | Why                                                                                                                                                                          | Status |
| --- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| C1  | **Prestige / New Shop mechanic**          | At Level 15+, allow opening a "second location" (prestige reset with permanent bonuses). Classic tycoon scaling mechanic that solves the late-game content drought entirely. | `[ ]`  |
| C2  | **Rare/Limited products**                 | Add 2-3 "limited edition" products that rotate weekly with higher margins but limited stock from supplier. Creates buying urgency and variety beyond 5 products.             | `[ ]`  |
| C3  | **Rent / Operating costs**                | Small daily rent scaling with shop level (50G at L1, 500G at L20). Forces the player to stay profitable. Adds mild tension without being punishing.                          | `[ ]`  |
| C4  | **Customer reviews / satisfaction score** | Track a satisfaction metric based on pricing, stock availability, and staff. Affects reputation gain rate. Gives the player something to optimize beyond pure profit.        | `[ ]`  |

---

## Implementation Notes

### Tier A Implementation Details

**A1 — Onboarding Banners:**

- Show on home page when `save.currentDay <= 3` and relevant conditions are unmet
- Banner 1 (Day 1, no inventory): "Buy stock from the Supplier to get started!"
- Banner 2 (Day 1-2, has inventory but empty shelves): "Stock your shelves so customers can buy!"
- Banner 3 (Day 1-3, shelves stocked but default markup): "Adjust your shelf markup for better profits."
- Banners auto-dismiss when the action is completed

**A2 — Traffic Tuning:**

- Modify `BASE_TRAFFIC_BY_LEVEL` in `economy.ts`
- L1: 5 -> 8, L2: 7 -> 10, L3: 10 -> 13
- Early levels should feel busy, not dead

**A3 — Level-up Reward:**

- Gold bonus: `50 + (newLevel * 25)` G (e.g., L2 = 100G, L10 = 300G, L20 = 550G)
- Shown in the end-of-day summary modal with a celebratory animation
- Applied during `advanceDay` in `day-cycle.ts`

**A4 — Stock-out Reputation Penalty:**

- In `processTick` (simulation.ts), when a customer arrives but ALL shelves are empty, deduct 1 reputation
- Add a "Lost sale — shelves empty!" notification to the live feed
- Capped at max 3 rep loss per day (don't punish new players too hard)

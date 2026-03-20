# Shop Graphics — Street Booth System

> **Approach**: Street booth / kiosk on a diagonal street view (Lemonade Tycoon inspired)
> **Tool**: DALL-E (ChatGPT image generation)
> **Style**: Warm illustrated 2D casual game art
> **Scene**: Diagonal street with a card-selling booth, pedestrians walking by
> **Progression**: Scenario backgrounds swap at level milestones, booth upgrades purchased separately

---

## Core Concept

The player runs a **card-selling booth on the street** — like the vendors you see at
tournaments, conventions, and cosplay events. The scene shows a diagonal street view
(Lemonade Tycoon style) with pedestrians walking by. Some stop at the booth to buy.

The booth itself can be upgraded (purchased separately), and the **scenario** (location)
changes as the player levels up — from a quiet street corner to a tournament hall.

### Why This Approach

- **One focal point** (the booth) instead of a full room with multiple shelf positions
- **Linear pedestrian flow** (walk across the street) instead of interior pathfinding
- **Booth is a single sprite** that swaps per upgrade tier
- **Background is just a street scene** — no interior perspective headaches
- **Products are small icons** on a flat booth surface
- **Fewer components** — 5 instead of 6+
- **Existing game state maps directly** — shelves = booth products, upgrades = booth tier

---

## Style Guide

### Visual Reference

**Lemonade Tycoon (2002)** — Diagonal street view with pre-rendered 2D backgrounds.
The "3D feel" comes from the diagonal perspective baked into the artwork. Our booth
sits on the street, customers walk by diagonally.

### Style Anchor (include in EVERY prompt)

```
Warm illustrated 2D game art for a mobile casual game. The style should feel cozy,
inviting, and polished — like a Lemonade Tycoon or mobile tycoon game. Clean lines,
soft lighting, warm color palette. NOT pixel art, NOT photorealistic. Think children's
book illustration meets casual mobile game. The scene uses a DIAGONAL perspective —
the street runs diagonally from bottom-left to upper-right, like Lemonade Tycoon.
Portrait orientation (taller than wide, for mobile phone screens).
```

### Color Palette

| Element               | Colors                                 |
| --------------------- | -------------------------------------- |
| Street/sidewalk       | Warm gray, light stone                 |
| Buildings/venue       | Warm cream, brick, varied per scenario |
| Booth (basic)         | Simple wood, white tablecloth          |
| Booth (upgraded)      | Dark wood, branded canvas, lights      |
| Origins (OGN)         | Blue / teal products                   |
| Spiritforged (SFD)    | Purple / magenta products              |
| Proving Grounds (OGS) | Green / earthy products                |
| Customer casual       | Green shirt                            |
| Customer collector    | Blue shirt, glasses                    |
| Customer competitive  | Red shirt                              |
| Customer kid          | Yellow/bright, smaller                 |
| Customer whale        | Gold/black, larger, fancy              |

### Technical Notes

- **Portrait orientation** — all backgrounds are portrait (taller than wide) for mobile
- **Target resolution**: ~390x500px display area → generate at ~1024x1320 (roughly 2.6x)
- **PNG format** for everything
- **Transparent background** for all sprites (booths, products, customers)
- **Consistent lighting direction** across all assets — light from above-center

---

## Directory Structure

```
public/images/shop/
├── backgrounds/
│   ├── street-corner.png       <- Quiet street (level 1-4)
│   ├── shopping-mall.png       <- Mall corridor (level 5-9)
│   ├── convention-center.png   <- Convention/cosplay event (level 10-14)
│   └── tournament-hall.png     <- Tournament venue (level 15-20)
├── booths/
│   ├── booth-tier-1.png        <- Folding table (starter)
│   ├── booth-tier-2.png        <- Small stand (upgrade 1)
│   ├── booth-tier-3.png        <- Proper kiosk (upgrade 2)
│   └── booth-tier-4.png        <- Premium booth (upgrade 3)
├── products/
│   ├── pack-origins.png        <- OGN booster pack icon
│   ├── pack-spiritforged.png   <- SFD booster pack icon
│   ├── box-origins.png         <- OGN booster box icon
│   ├── box-spiritforged.png    <- SFD booster box icon
│   └── starter-proving.png     <- OGS starter box icon
└── customers/
    ├── customer-casual.png     <- Green shirt, walking
    ├── customer-collector.png  <- Blue shirt, glasses
    ├── customer-competitive.png <- Red shirt/jersey
    ├── customer-kid.png        <- Yellow, smaller
    └── customer-whale.png      <- Gold/black, larger
```

---

## Scenarios — Progressive Location Unlock

The background scene changes as the player levels up. Each location has more foot
traffic and different customer type bonuses. The background swaps automatically.

| Scenario              | Levels | Traffic Mult | Special Bonus                      | Description                                                     |
| --------------------- | ------ | ------------ | ---------------------------------- | --------------------------------------------------------------- |
| **Street Corner**     | 1–4    | 1.0x (base)  | —                                  | Quiet neighborhood sidewalk, trees, benches, few passersby      |
| **Shopping Mall**     | 5–9    | 1.25x        | +10% kid customers                 | Indoor mall corridor, other shops visible, busier crowd         |
| **Convention Center** | 10–14  | 1.5x         | +20% collector customers           | Event venue, cosplay banners, excited crowd, event booth area   |
| **Tournament Hall**   | 15–20  | 1.75x        | +15% competitive & whale customers | Tournament venue, competitive banners, big crowds, premium feel |

### Scene Layout (All Scenarios)

```
┌──────────────────────────────────┐
│                                  │
│     BACKGROUND                   │  top ~30%
│     (buildings / venue / sky)    │
│                                  │
├─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┤
│  ╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱  │
│ ╱  STREET / WALKWAY            ╱ │  ~30-50%
│╱   (pedestrians walk →→→)     ╱  │  diagonal path
│╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱   │
│                                  │
├─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┤
│         ┌─────────────┐          │
│         │   BOOTH     │          │  ~55-80%
│         │ [products]  │          │  (booth tier sprite overlaid)
│         │ [seller]    │          │
│         └─────────────┘          │
│                                  │
│     FOREGROUND (ground)          │  bottom ~15%
└──────────────────────────────────┘
```

The booth sits at a **fixed position** (~center, y ~55-80%) across all scenarios.
Products sit on the booth surface at predefined spots relative to the booth sprite.
The seller is **baked into the booth sprite** (drawn as part of each tier image).

---

## Booth Tiers — Purchasable Upgrade

A new upgrade category (`booth`) in the upgrade system. The player buys booth upgrades
with gold. Each tier is a separate booth sprite overlaid on the scenario background.

| Tier | Name          | Cost  | Product Slots | Visual Description                                                      |
| ---- | ------------- | ----- | ------------- | ----------------------------------------------------------------------- |
| 1    | Folding Table | Free  | 3             | Folding table, cardboard sign, tablecloth. Seller sitting behind it.    |
| 2    | Small Stand   | 750G  | 4             | Proper table, printed banner, small shelf behind, stool for seller.     |
| 3    | Kiosk         | 2500G | 5             | Enclosed kiosk, display shelving, hanging sign, small canopy.           |
| 4    | Premium Booth | 6000G | 6             | Full booth, branded canopy, glass display, LED strip lights, pro setup. |

**Visual upgrade indicators** (small details on the booth, not separate assets):

- **Better Signage** upgrade → small banner/sign appears on booth
- **Premium Lighting** upgrade → tiny light glow effect (CSS)
- **Loyalty Program** → small "REWARDS" sign

---

## Customer Animation (Simple)

1. Customer sprite appears at the left or right edge of the street area
2. Walks diagonally across (~3s, Framer Motion x/y animation, with CSS walk-bounce)
3. **If buying**: pauses briefly near booth (~0.5s), product icon fades out, "+150G" floats up
4. **If not buying**: walks straight past without stopping
5. Customer sprite fades out at opposite edge

No queuing, no thought bubbles, no pathfinding. Multiple customers walk simultaneously
(staggered spawn). Maps directly to `CustomerVisitResult[]` from the day cycle engine.

### Walk Bounce CSS

```css
@keyframes walk-bounce {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-3px);
  }
}
.walking {
  animation: walk-bounce 0.3s ease-in-out infinite;
}
```

---

## Product Display (Simple Icons)

- Small product icons (~30x30px) on the booth surface at fixed positions
- Quantity shown as a number badge (small circle with count)
- When restocked: icon fades in (opacity 0→1, slight scale up)
- When sold: icon fades out (opacity 1→0, slight scale down), quantity badge updates
- When sold out: empty spot
- 3-6 product positions depending on booth tier

---

## Asset List

| #   | Category   | Asset                  | Size      | Notes                        |
| --- | ---------- | ---------------------- | --------- | ---------------------------- |
| 1   | Background | Street Corner          | 1024x1320 | Starter scenario             |
| 2   | Background | Shopping Mall          | 1024x1320 | Level 5 unlock               |
| 3   | Background | Convention Center      | 1024x1320 | Level 10 unlock              |
| 4   | Background | Tournament Hall        | 1024x1320 | Level 15 unlock              |
| 5   | Booth      | Tier 1 - Folding Table | ~400x350  | Transparent, seller included |
| 6   | Booth      | Tier 2 - Small Stand   | ~450x400  | Transparent, seller included |
| 7   | Booth      | Tier 3 - Kiosk         | ~500x450  | Transparent, seller included |
| 8   | Booth      | Tier 4 - Premium Booth | ~550x500  | Transparent, seller included |
| 9   | Product    | Pack (blue/teal)       | ~80x80    | OGN - transparent            |
| 10  | Product    | Pack (purple)          | ~80x80    | SFD - transparent            |
| 11  | Product    | Box (blue/teal)        | ~100x80   | OGN - transparent            |
| 12  | Product    | Box (purple)           | ~100x80   | SFD - transparent            |
| 13  | Product    | Starter (green)        | ~90x80    | OGS - transparent            |
| 14  | Customer   | Casual (green)         | ~80x120   | Walking pose, transparent    |
| 15  | Customer   | Collector (blue)       | ~80x120   | Walking pose, transparent    |
| 16  | Customer   | Competitive (red)      | ~80x120   | Walking pose, transparent    |
| 17  | Customer   | Kid (yellow)           | ~60x90    | Smaller, transparent         |
| 18  | Customer   | Whale (gold/black)     | ~90x130   | Larger, transparent          |
|     | **TOTAL**  |                        |           | **18 assets**                |

Sale effects (floating "+G" text, sparkle) are done purely in CSS/Framer Motion — no image assets needed.

---

## React Components

```
src/components/game/
├── booth-scene.tsx          — Main container: scenario bg + booth tier overlay
├── booth-products.tsx       — Product icons on the booth surface
├── street-crowd.tsx         — Walking customer sprites
├── sale-effect.tsx          — Floating "+150G" text animation
└── booth-scene-config.ts    — Position configs, scenario/booth definitions
```

### BoothScene

Main container component. Loads the correct scenario background based on shop level
and overlays the booth tier sprite based on the booth upgrade level.

```tsx
// Simplified structure:
<div className="relative w-full" style={{ aspectRatio: "1024/1320" }}>
  {/* Scenario background */}
  <Image src={scenarioBg} fill alt="" />

  {/* Street crowd (walking customers) */}
  <StreetCrowd customers={todayResults} />

  {/* Booth sprite */}
  <div
    className="absolute"
    style={{ bottom: "15%", left: "20%", width: "60%" }}
  >
    <Image src={boothSprite} alt="Booth" />

    {/* Products on booth */}
    <BoothProducts shelves={shelves} boothTier={boothTier} />
  </div>

  {/* Sale effects */}
  <SaleEffect sales={recentSales} />
</div>
```

### BoothProducts

Reads `shelves[]` from Zustand store. Maps each shelf to a product icon at a fixed
position on the booth surface. Uses Framer Motion `AnimatePresence` for fade in/out.

### StreetCrowd

Takes `CustomerVisitResult[]` and spawns customer sprites with staggered timing.
Each customer is a Framer Motion animated `<Image>` that slides diagonally across
the street area. Buyers pause briefly near the booth position.

### SaleEffect

Floating "+{amount}G" text. Pure Framer Motion: text animates upward from the booth
and fades out. Gold-colored text, no image asset needed.

### booth-scene-config.ts

Configuration for scenarios, booth tiers, and product positions:

```typescript
export const SCENARIOS = {
  street: {
    bg: "/images/shop/backgrounds/street-corner.png",
    trafficMult: 1.0,
  },
  mall: { bg: "/images/shop/backgrounds/shopping-mall.png", trafficMult: 1.25 },
  convention: {
    bg: "/images/shop/backgrounds/convention-center.png",
    trafficMult: 1.5,
  },
  tournament: {
    bg: "/images/shop/backgrounds/tournament-hall.png",
    trafficMult: 1.75,
  },
};

export const BOOTH_TIERS = {
  1: { sprite: "/images/shop/booths/booth-tier-1.png", slots: 3 },
  2: { sprite: "/images/shop/booths/booth-tier-2.png", slots: 4 },
  3: { sprite: "/images/shop/booths/booth-tier-3.png", slots: 5 },
  4: { sprite: "/images/shop/booths/booth-tier-4.png", slots: 6 },
};
```

---

## Integration Points

- **Scenario** → Pure function maps `shopLevel` → `ScenarioId`. Traffic bonus feeds into `calculateDailyTraffic()`.
- **Booth tier** → New `booth_upgrade` in upgrade catalog. Level 0 = tier 1, level 3 = tier 4. Also grants +1 shelf slot per level.
- **Products on booth** → Reads existing `shelves[]` state from Zustand store.
- **Customers** → Reads `CustomerVisitResult[]` from day simulation (`todayReport`).
- **Sale effects** → Triggered when `todayReport.revenue` changes.
- **Home page** → `BoothScene` replaces the stats cards as the hero visual.

---

## DALL-E Prompts

### Scenario Backgrounds

Generate all 4 in a single DALL-E conversation for consistent style.

#### Street Corner (Level 1-4)

**Status**: [ ] Prompt ready [x] — [ ] Generated — [ ] Integrated
**File**: `public/images/shop/backgrounds/street-corner.png`

```
Create a warm, illustrated 2D game background of a quiet neighborhood STREET CORNER
viewed from a DIAGONAL perspective — the street runs diagonally from the bottom-left
to the upper-right of the image, like in Lemonade Tycoon.

The scene is OUTDOORS:
- A quiet sidewalk/street with a few trees and a bench
- Low-rise buildings or storefronts in the background (upper portion)
- The street/sidewalk takes up the middle band of the image, running diagonally
- The lower portion (~40% of the image) is the sidewalk/ground area where a vendor
  booth would be set up (but DON'T draw the booth — we overlay it separately)
- A few subtle details: a lamppost, some potted plants, maybe a bicycle parked
- Warm afternoon lighting, soft shadows
- The area where people would walk is clear and runs diagonally

Style: warm illustrated 2D game art for a mobile casual game. Clean lines, soft colors,
NOT pixel art, NOT photorealistic. Cozy neighborhood feel. Portrait orientation (taller
than wide). The street should feel inviting but quiet — not many people around.
```

#### Shopping Mall (Level 5-9)

**Status**: [ ] Prompt ready [x] — [ ] Generated — [ ] Integrated
**File**: `public/images/shop/backgrounds/shopping-mall.png`

```
Create a warm, illustrated 2D game background of an INDOOR SHOPPING MALL CORRIDOR
viewed from a DIAGONAL perspective — the corridor runs diagonally from bottom-left
to upper-right, like in Lemonade Tycoon.

Using the SAME art style as the previous image:
- A bright, clean mall interior corridor
- Shop fronts visible on both sides (toy store, clothing store, etc.)
- Tiled or polished floor reflecting overhead lights
- The corridor runs diagonally through the image
- The lower portion (~40%) is open floor space for a vendor booth (don't draw the booth)
- Mall details: decorative plants, directory signs, escalator in background
- Bright, even lighting from overhead
- Busier feel — more inviting, more traffic

Style: same warm illustrated 2D game art as before. Clean, bright, mall-like.
Portrait orientation. The mall should feel lively and commercial.
```

#### Convention Center (Level 10-14)

**Status**: [ ] Prompt ready [x] — [ ] Generated — [ ] Integrated
**File**: `public/images/shop/backgrounds/convention-center.png`

```
Create a warm, illustrated 2D game background of a CONVENTION/COSPLAY EVENT venue
viewed from a DIAGONAL perspective — the walkway runs diagonally from bottom-left
to upper-right.

Using the SAME art style as the previous images:
- An event venue / convention hall entrance area
- Colorful banners and flags hanging from above ("CARD CON", event branding)
- Other vendor booths/stalls visible in the background
- People in costumes visible as tiny background elements (not main characters)
- Convention atmosphere: excited energy, decorations, maybe a stage area visible
- The walkway runs diagonally with the lower portion open for the player's booth
- Event lighting: colorful but warm, maybe some string lights

Style: same warm illustrated 2D game art. Festive, exciting convention atmosphere.
Portrait orientation. Should feel bustling and exciting.
```

#### Tournament Hall (Level 15-20)

**Status**: [ ] Prompt ready [x] — [ ] Generated — [ ] Integrated
**File**: `public/images/shop/backgrounds/tournament-hall.png`

```
Create a warm, illustrated 2D game background of a TOURNAMENT HALL / COMPETITIVE
GAMING VENUE viewed from a DIAGONAL perspective — the walkway runs diagonally from
bottom-left to upper-right.

Using the SAME art style as the previous images:
- A premium tournament venue with professional feel
- Large tournament banners ("RIFTBOUND CHAMPIONSHIP", trophy icons)
- Tournament tables visible in the background with tiny players
- Professional lighting: stage lights, spotlights
- Premium feel: velvet rope barriers, VIP area, digital screens showing brackets
- The walkway runs diagonally, lower portion open for the player's booth
- Rich colors: deep blues, golds, tournament prestige

Style: same warm illustrated 2D game art but with a premium, prestigious feel.
Portrait orientation. Should feel like the pinnacle venue — impressive and exciting.
```

---

### Booth Tiers

Generate all 4 in a single DALL-E conversation. Each booth sprite includes the seller
character behind it. Transparent background.

#### Tier 1 — Folding Table

**Status**: [ ] Prompt ready [x] — [ ] Generated — [ ] Integrated
**File**: `public/images/shop/booths/booth-tier-1.png`

```
Create an illustrated game sprite of a humble CARD SELLING SETUP viewed from a slight
diagonal angle (matching a diagonal street scene). Transparent background.

The setup:
- A simple FOLDING TABLE with a plain tablecloth (white or light blue)
- A small handwritten CARDBOARD SIGN taped to the front: "CARDS FOR SALE"
- The table surface is visible from above (you can see products would sit on it)
- A friendly SELLER CHARACTER sitting behind the table on a folding chair
  - The seller wears a casual t-shirt, friendly smile, slightly cartoonish proportions
  - Sitting behind the table, facing forward
- A small cardboard cash box on one end of the table
- Very humble, starter vibe — charming but clearly budget

Style: warm illustrated 2D game art, clean lines, soft shading. The sprite should
be about 400x350 pixels. Transparent background. NOT pixel art.
```

#### Tier 2 — Small Stand

**Status**: [ ] Prompt ready [x] — [ ] Generated — [ ] Integrated
**File**: `public/images/shop/booths/booth-tier-2.png`

```
Using the same art style, create an UPGRADED version of the card selling booth.
Transparent background.

The setup (improved from folding table):
- A proper WOODEN TABLE (not folding) with a nicer tablecloth
- A PRINTED BANNER hanging from the front of the table: "RIFTBOUND CARDS"
- A small SHELF UNIT behind the seller with a few display slots
- The same seller character, now sitting on a proper stool
  - Wearing an apron over their t-shirt (more professional)
- A small cash register replacing the cardboard box
- Slightly larger footprint, more professional feel

Style: same warm illustrated 2D game art. About 450x400 pixels. Transparent background.
```

#### Tier 3 — Kiosk

**Status**: [ ] Prompt ready [x] — [ ] Generated — [ ] Integrated
**File**: `public/images/shop/booths/booth-tier-3.png`

```
Using the same art style, create a PROPER KIOSK version. Transparent background.

The setup:
- An ENCLOSED KIOSK structure — three-sided booth with a counter opening
- A SMALL CANOPY or awning over the top
- A HANGING SIGN from the canopy: "RIFTBOUND CARDS" in nice lettering
- Display shelving behind the seller with multiple levels
- A small GLASS DISPLAY CASE on the counter
- The seller standing behind the counter (not sitting anymore)
  - Wearing a branded polo or nice shirt
- More product display area visible on the counter surface
- Professional but still approachable

Style: same warm illustrated 2D game art. About 500x450 pixels. Transparent background.
```

#### Tier 4 — Premium Booth

**Status**: [ ] Prompt ready [x] — [ ] Generated — [ ] Integrated
**File**: `public/images/shop/booths/booth-tier-4.png`

```
Using the same art style, create the ULTIMATE PREMIUM BOOTH. Transparent background.

The setup:
- A FULL PREMIUM BOOTH with branded canopy/awning (dark blue/purple colors)
- LED strip lights around the edges (glowing warm white)
- A LARGE branded sign: "RIFTBOUND CARDS" in stylish lettering with a glow effect
- Multiple display levels: counter, shelving, glass cases
- Professional RACK DISPLAY behind the seller
- The seller standing proudly, wearing a branded jacket
- A small speaker visible (for music)
- Premium materials: dark polished wood counter, metal frame
- The booth radiates success and quality

Style: same warm illustrated 2D game art. About 550x500 pixels. Transparent background.
```

---

### Product Icons

Generate all 5 in a single batch. Small icons viewed from slightly above.

**Status**: [ ] Prompt ready [x] — [ ] Generated — [ ] Cropped

```
Create 5 small illustrated PRODUCT ICONS for a mobile tycoon game, arranged in a row
with clear space between them on a transparent background.

Each product is a small trading card game product viewed from slightly above (like
looking down at items on a table). Simple, clean, icon-like.

From left to right:
1. BOOSTER PACK (blue/teal) — Small foil wrapper, blue and teal colors, shiny
2. BOOSTER PACK (purple/magenta) — Same shape, purple/magenta colors
3. BOOSTER BOX (blue/teal) — Larger rectangular box, blue/teal, "Origins" text
4. BOOSTER BOX (purple/magenta) — Same shape, purple/magenta, "Spiritforged" text
5. STARTER BOX (green/earthy) — Medium box, green colors, "Starter" text

Style: warm illustrated 2D game art, clean lines, simple. Each item about 80-100px.
These are small UI icons, not detailed illustrations. Transparent background.
```

---

### Customer Sprites

Generate all 5 in a single batch. Walking pose, viewed from the side.

**Status**: [ ] Prompt ready [x] — [ ] Generated — [ ] Cropped

```
Create 5 illustrated CHARACTER SPRITES for a mobile tycoon game, arranged in a row
with clear space between them on a transparent background.

Each character is in a WALKING POSE, viewed from the side (profile/three-quarter view),
as if walking along a street from left to right. Stylized casual game proportions
(slightly large heads, ~4-5 head-heights tall). One foot forward mid-stride.

From left to right:
1. CASUAL CUSTOMER — Green t-shirt, jeans, relaxed posture, small shopping bag
2. COLLECTOR CUSTOMER — Blue button-up, glasses, carrying a card binder
3. COMPETITIVE CUSTOMER — Red athletic shirt/jersey, confident stride, deck box
4. KID CUSTOMER — Noticeably SHORTER (~60-70% height), yellow t-shirt, backpack,
   excited expression
5. WHALE CUSTOMER — Noticeably TALLER/LARGER, black and gold jacket, premium
   shopping bag, confident posture, sunglasses

Style: warm illustrated 2D game art, clean lines, soft shading. Characters should
feel friendly and approachable. Transparent background. NOT pixel art.
```

---

## Generation Order

1. **Street Corner background** (1/4) — establishes the art style
2. **Remaining backgrounds** (2-4) — same DALL-E conversation for consistency
3. **Booth tiers** (1-4) — new conversation, reference the street style
4. **Product icons** (all 5) — new conversation, batch
5. **Customer sprites** (all 5) — new conversation, batch

---

## Implementation Checklist

### Phase 1 — Code Infrastructure (no assets needed)

- [x] Add `ScenarioId` type to `types/game.ts`
- [x] Add `booth_upgrade` to upgrade catalog
- [x] Add `getScenario()` mapping function
- [x] Integrate scenario traffic bonus into `calculateDailyTraffic()`
- [x] Build `booth-scene-config.ts`
- [x] Build placeholder `BoothScene` component (colored divs, no images)
- [x] Build `BoothProducts` component
- [x] Build `StreetCrowd` component
- [x] Build `SaleEffect` component
- [x] Add CSS animations (walk-bounce)
- [x] Integrate `BoothScene` into home page

### Phase 2 — Assets (DALL-E generation)

- [ ] Generate 4 scenario backgrounds
- [ ] Generate 4 booth tier sprites
- [ ] Generate 5 product icons
- [ ] Generate 5 customer sprites
- [ ] Replace placeholder graphics with real assets

### Phase 3 — Polish

- [ ] Fine-tune product positions per booth tier
- [ ] Adjust customer walk path per scenario
- [ ] Add visual upgrade indicators on booth
- [ ] Performance optimization (lazy loading, image sizing)

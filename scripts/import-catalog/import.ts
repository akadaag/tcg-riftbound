/**
 * Catalog Import Script
 *
 * Fetches all sets and cards from the RiftCodex API, normalises them into
 * the internal Riftbound Shop format, computes gameplay-meta values, and
 * writes versioned JSON files to src/data/.
 *
 * Usage:
 *   node --experimental-strip-types scripts/import-catalog/import.ts
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// ── Types matching our internal definitions ──────────────────────────

type Rarity = "common" | "uncommon" | "rare" | "epic" | "showcase";
type ShowcaseVariant = "alternate_art" | "overnumbered" | "signature";
type CardType = "battlefield" | "gear" | "legend" | "rune" | "spell" | "unit";
type Supertype = "basic" | "champion" | "signature" | "token";
type Domain =
  | "body"
  | "calm"
  | "chaos"
  | "colorless"
  | "fury"
  | "mind"
  | "order";
type CardOrientation = "portrait" | "landscape";

interface CardDefinition {
  id: string;
  riftboundId: string;
  publicCode: string;
  name: string;
  setCode: string;
  setName: string;
  collectorNumber: number;
  rarity: Rarity;
  cardType: CardType;
  supertype: Supertype | null;
  domains: Domain[];
  attributes: {
    energy: number | null;
    might: number | null;
    power: number | null;
  };
  textPlain: string | null;
  textRich: string | null;
  imageUrl: string;
  artist: string | null;
  accessibilityText: string | null;
  orientation: CardOrientation;
  tags: string[];
  showcaseVariant: ShowcaseVariant | null;
  metadata: {
    cleanName: string;
    alternateArt: boolean;
    overnumbered: boolean;
    signature: boolean;
  };
}

interface CardGameplayMeta {
  cardId: string;
  baseValue: number;
  collectorScore: number;
  playableScore: number;
  displayScore: number;
  pullWeight: number;
}

interface SetDefinition {
  setCode: string;
  setName: string;
  baseCardCount: number;
  totalCardCount: number;
  releaseOrder: number;
  publishDate: string | null;
  tcgplayerId: number | null;
  hypeBase: number;
  completionReward: {
    type: "currency" | "unlock_product" | "cosmetic";
    value: number;
    description: string;
  };
}

// ── RiftCodex API response shapes ───────────────────────────────────

interface ApiCard {
  id: string;
  name: string;
  riftbound_id: string;
  tcgplayer_id: number | null;
  public_code: string;
  collector_number: number;
  attributes: {
    energy: number | null;
    might: number | null;
    power: number | null;
  };
  classification: {
    type: string;
    supertype: string | null;
    rarity: string;
    domain: string[];
  };
  text: { rich: string | null; plain: string | null } | null;
  set: { set_id: string; label: string };
  media: {
    image_url: string;
    artist: string | null;
    accessibility_text: string | null;
  };
  tags: string[];
  orientation: string;
  metadata: {
    clean_name: string;
    alternate_art: boolean;
    overnumbered: boolean;
    signature: boolean;
  };
}

interface ApiSet {
  id: string;
  name: string;
  set_id: string;
  label: string;
  card_count: number;
  tcgplayer_id: string | null;
  cardmarket_id: string | null;
  publish_date: string | null;
  update_date: string | null;
}

interface ApiPaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

// ── Constants ────────────────────────────────────────────────────────

const API_BASE = "https://api.riftcodex.com";
const PAGE_SIZE = 100;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_DIR = join(__dirname, "..", "..", "src", "data");

// Set release order and gameplay tuning
const SET_CONFIG: Record<
  string,
  { releaseOrder: number; hypeBase: number; rewardValue: number }
> = {
  OGS: { releaseOrder: 0, hypeBase: 0.6, rewardValue: 200 },
  OGN: { releaseOrder: 1, hypeBase: 1.0, rewardValue: 1000 },
  SFD: { releaseOrder: 2, hypeBase: 1.2, rewardValue: 1500 },
};

// ── Helpers ──────────────────────────────────────────────────────────

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`GET ${url} → ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

async function fetchAllCards(): Promise<ApiCard[]> {
  const all: ApiCard[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const url = `${API_BASE}/cards?page=${page}&size=${PAGE_SIZE}`;
    console.log(`  Fetching ${url}`);
    const res = await fetchJson<ApiPaginatedResponse<ApiCard>>(url);
    all.push(...res.items);
    totalPages = res.pages;
    page++;
  }
  return all;
}

async function fetchAllSets(): Promise<ApiSet[]> {
  const url = `${API_BASE}/sets`;
  console.log(`  Fetching ${url}`);
  const res = await fetchJson<ApiPaginatedResponse<ApiSet>>(url);
  return res.items;
}

function normaliseRarity(raw: string): Rarity {
  const lower = raw.toLowerCase();
  if (
    lower === "common" ||
    lower === "uncommon" ||
    lower === "rare" ||
    lower === "epic" ||
    lower === "showcase"
  ) {
    return lower;
  }
  throw new Error(`Unknown rarity: ${raw}`);
}

function normaliseCardType(raw: string): CardType {
  const lower = raw.toLowerCase();
  if (
    lower === "battlefield" ||
    lower === "gear" ||
    lower === "legend" ||
    lower === "rune" ||
    lower === "spell" ||
    lower === "unit"
  ) {
    return lower;
  }
  throw new Error(`Unknown card type: ${raw}`);
}

function normaliseSupertype(raw: string | null): Supertype | null {
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if (
    lower === "basic" ||
    lower === "champion" ||
    lower === "signature" ||
    lower === "token"
  ) {
    return lower;
  }
  throw new Error(`Unknown supertype: ${raw}`);
}

function normaliseDomain(raw: string): Domain {
  const lower = raw.toLowerCase();
  if (
    lower === "body" ||
    lower === "calm" ||
    lower === "chaos" ||
    lower === "colorless" ||
    lower === "fury" ||
    lower === "mind" ||
    lower === "order"
  ) {
    return lower;
  }
  throw new Error(`Unknown domain: ${raw}`);
}

function normaliseOrientation(raw: string): CardOrientation {
  const lower = raw.toLowerCase();
  if (lower === "portrait" || lower === "landscape") return lower;
  return "portrait"; // fallback
}

function deriveShowcaseVariant(
  meta: ApiCard["metadata"],
): ShowcaseVariant | null {
  if (meta.signature) return "signature";
  if (meta.overnumbered) return "overnumbered";
  if (meta.alternate_art) return "alternate_art";
  return null;
}

// ── Card normalisation ───────────────────────────────────────────────

function normaliseCard(api: ApiCard): CardDefinition {
  const rarity = normaliseRarity(api.classification.rarity);
  return {
    id: api.id,
    riftboundId: api.riftbound_id,
    publicCode: api.public_code,
    name: api.name,
    setCode: api.set.set_id,
    setName: api.set.label,
    collectorNumber: api.collector_number,
    rarity,
    cardType: normaliseCardType(api.classification.type),
    supertype: normaliseSupertype(api.classification.supertype),
    domains: api.classification.domain.map(normaliseDomain),
    attributes: {
      energy: api.attributes.energy,
      might: api.attributes.might,
      power: api.attributes.power,
    },
    textPlain: api.text?.plain ?? null,
    textRich: api.text?.rich ?? null,
    imageUrl: api.media.image_url,
    artist: api.media.artist ?? null,
    accessibilityText: api.media.accessibility_text ?? null,
    orientation: normaliseOrientation(api.orientation),
    tags: api.tags,
    showcaseVariant:
      rarity === "showcase" ? deriveShowcaseVariant(api.metadata) : null,
    metadata: {
      cleanName: api.metadata.clean_name,
      alternateArt: api.metadata.alternate_art,
      overnumbered: api.metadata.overnumbered,
      signature: api.metadata.signature,
    },
  };
}

// ── Set normalisation ────────────────────────────────────────────────

function normaliseSet(api: ApiSet, cards: CardDefinition[]): SetDefinition {
  const setCards = cards.filter((c) => c.setCode === api.set_id);
  const baseCards = setCards.filter((c) => c.rarity !== "showcase");
  const config = SET_CONFIG[api.set_id] ?? {
    releaseOrder: 99,
    hypeBase: 1.0,
    rewardValue: 500,
  };

  // Use the better display name: label unless it's just the set code
  const displayName =
    api.label && api.label !== api.set_id ? api.label : api.name;

  return {
    setCode: api.set_id,
    setName: displayName,
    baseCardCount: baseCards.length,
    totalCardCount: setCards.length,
    releaseOrder: config.releaseOrder,
    publishDate: api.publish_date,
    tcgplayerId: api.tcgplayer_id ? parseInt(api.tcgplayer_id, 10) : null,
    hypeBase: config.hypeBase,
    completionReward: {
      type: "currency",
      value: config.rewardValue,
      description: `Complete the ${displayName} set`,
    },
  };
}

// ── Gameplay meta computation ────────────────────────────────────────

/**
 * Computes derived gameplay values for a card.
 *
 * baseValue: soft-currency value when sold by a customer (shop revenue).
 * collectorScore: how much the card is "worth" for collection completion.
 * playableScore: perceived competitive demand (drives competitive customer interest).
 * displayScore: visual appeal (drives casual customer interest).
 * pullWeight: relative frequency inside its rarity tier (higher = pulled more often).
 */
function computeGameplayMeta(card: CardDefinition): CardGameplayMeta {
  // --- Base value by rarity ---
  const rarityValues: Record<Rarity, number> = {
    common: 5,
    uncommon: 15,
    rare: 50,
    epic: 150,
    showcase: 300,
  };
  let baseValue = rarityValues[card.rarity];

  // Showcase variant multipliers
  if (card.rarity === "showcase") {
    if (card.showcaseVariant === "signature") baseValue = 1000;
    else if (card.showcaseVariant === "overnumbered") baseValue = 500;
    else if (card.showcaseVariant === "alternate_art") baseValue = 300;
  }

  // Champions are worth more
  if (card.supertype === "champion") {
    baseValue = Math.round(baseValue * 1.5);
  }

  // --- Collector score ---
  const rarityCollectorBase: Record<Rarity, number> = {
    common: 1,
    uncommon: 3,
    rare: 8,
    epic: 20,
    showcase: 50,
  };
  let collectorScore = rarityCollectorBase[card.rarity];
  if (card.showcaseVariant === "signature") collectorScore = 200;
  else if (card.showcaseVariant === "overnumbered") collectorScore = 100;

  // --- Playable score (higher for units, champions, spells) ---
  const typePlayable: Record<CardType, number> = {
    unit: 7,
    legend: 8,
    spell: 6,
    gear: 5,
    rune: 3,
    battlefield: 4,
  };
  let playableScore = typePlayable[card.cardType];
  if (card.supertype === "champion") playableScore += 3;
  if (card.rarity === "epic") playableScore += 2;
  if (card.rarity === "rare") playableScore += 1;

  // --- Display score (art appeal proxy) ---
  let displayScore = 5;
  if (card.orientation === "landscape") displayScore += 2; // battlefields look cool
  if (card.rarity === "showcase") displayScore = 9;
  if (card.rarity === "epic") displayScore += 2;
  if (card.supertype === "champion") displayScore += 1;

  // --- Pull weight (within rarity tier — higher = more common) ---
  // Base weight = 100. Showcase variants have lower weights to be rarer.
  let pullWeight = 100;
  if (card.rarity === "showcase") {
    if (card.showcaseVariant === "alternate_art") pullWeight = 20;
    else if (card.showcaseVariant === "overnumbered") pullWeight = 5;
    else if (card.showcaseVariant === "signature") pullWeight = 1;
  }
  // Tokens/basic runes pull evenly
  if (card.supertype === "token" || card.supertype === "basic") {
    pullWeight = 100;
  }

  return {
    cardId: card.id,
    baseValue,
    collectorScore,
    playableScore: Math.min(10, playableScore),
    displayScore: Math.min(10, displayScore),
    pullWeight,
  };
}

// ── File writing ─────────────────────────────────────────────────────

function writeJson(relPath: string, data: unknown): void {
  const fullPath = join(DATA_DIR, relPath);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, JSON.stringify(data, null, 2) + "\n", "utf-8");
  console.log(`  ✓ Wrote ${fullPath}`);
}

// ── Main ─────────────────────────────────────────────────────────────

async function main() {
  console.log("╔══════════════════════════════════════════╗");
  console.log("║  Riftbound Shop — Catalog Import         ║");
  console.log("╚══════════════════════════════════════════╝\n");

  // 1. Fetch sets
  console.log("1. Fetching sets...");
  const apiSets = await fetchAllSets();
  console.log(`   Found ${apiSets.length} sets.\n`);

  // 2. Fetch all cards (paginated)
  console.log("2. Fetching cards...");
  const apiCards = await fetchAllCards();
  console.log(`   Found ${apiCards.length} cards.\n`);

  // 3. Normalise cards
  console.log("3. Normalising cards...");
  const cards = apiCards.map(normaliseCard);

  // Sort by set code, then collector number
  cards.sort((a, b) => {
    const setCompare = a.setCode.localeCompare(b.setCode);
    if (setCompare !== 0) return setCompare;
    return a.collectorNumber - b.collectorNumber;
  });

  // Print rarity breakdown
  const rarityCounts: Record<string, number> = {};
  for (const c of cards) {
    const key = c.rarity + (c.showcaseVariant ? `:${c.showcaseVariant}` : "");
    rarityCounts[key] = (rarityCounts[key] || 0) + 1;
  }
  console.log("   Rarity breakdown:", rarityCounts);
  console.log();

  // 4. Normalise sets
  console.log("4. Normalising sets...");
  const sets = apiSets
    .map((s) => normaliseSet(s, cards))
    .sort((a, b) => a.releaseOrder - b.releaseOrder);

  for (const s of sets) {
    console.log(
      `   ${s.setCode}: ${s.setName} — ${s.baseCardCount} base / ${s.totalCardCount} total`,
    );
  }
  console.log();

  // 5. Compute gameplay meta
  console.log("5. Computing gameplay meta...");
  const gameplayMeta = cards.map(computeGameplayMeta);
  console.log(`   Computed meta for ${gameplayMeta.length} cards.\n`);

  // 6. Write files
  console.log("6. Writing data files...");

  // Catalog version — ISO timestamp of import
  const catalogVersion = new Date().toISOString();

  writeJson("sets/sets.json", { catalogVersion, sets });
  writeJson("cards/cards.json", { catalogVersion, cards });
  writeJson("cards/gameplay-meta.json", { catalogVersion, meta: gameplayMeta });

  console.log();
  console.log("✅ Import complete!");
  console.log(`   Catalog version: ${catalogVersion}`);
  console.log(`   Sets: ${sets.length}`);
  console.log(`   Cards: ${cards.length}`);
  console.log(`   Gameplay meta entries: ${gameplayMeta.length}`);
}

main().catch((err) => {
  console.error("❌ Import failed:", err);
  process.exit(1);
});

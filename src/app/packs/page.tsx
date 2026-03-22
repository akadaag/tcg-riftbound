"use client";

import { useGameStore } from "@/stores/game-store";
import {
  getProductById,
  getDropTableForProduct,
  getAllCards,
  getAllGameplayMeta,
} from "@/features/catalog";
import {
  openPack,
  openPackBatch,
  sortForReveal,
} from "@/features/engine/pack-opener";
import {
  getActiveEvents,
  getCombinedEventModifiers,
} from "@/features/engine/events";
import type { CardDefinition, CardGameplayMeta, Rarity } from "@/types/game";
import { getCardById } from "@/features/catalog";
import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { m, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
  revealCardFlip,
  revealCardFlipFast,
  cardDetailsSlide,
  cardDetailsSlideFast,
  newBadgeBounce,
  summaryStaggerContainer,
  summaryStaggerItem,
  counterPillVariants,
  staggerContainer,
  staggerItem,
  fadeSlideUp,
} from "@/lib/animations";

type PageState = "select" | "opening" | "reveal" | "batch_reveal" | "summary";

interface RevealCard {
  card: CardDefinition;
  rarity: Rarity;
  isNew: boolean;
  slotLabel: string;
}

export default function PacksPage() {
  const { save, removeInventory, addCardsToCollection, recordPackOpened } =
    useGameStore();
  const [pageState, setPageState] = useState<PageState>("select");
  const [revealCards, setRevealCards] = useState<RevealCard[]>([]);
  const [revealIndex, setRevealIndex] = useState(0);
  const [flippedSet, setFlippedSet] = useState<Set<number>>(new Set());
  const [isBatchMode, setIsBatchMode] = useState(false);
  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [lastStats, setLastStats] = useState<{
    newCount: number;
    dupeCount: number;
  } | null>(null);

  // Precompute meta map
  const metaMap = useMemo(() => {
    const map = new Map<string, CardGameplayMeta>();
    for (const m of getAllGameplayMeta()) {
      map.set(m.cardId, m);
    }
    return map;
  }, []);

  // Get active events for rarity boost
  const activeEvents = getActiveEvents(save.activeEvents, save.currentDay);
  const eventMods = getCombinedEventModifiers(activeEvents);

  // Packs available to open
  const openablePacks = save.inventory.filter((item) => {
    const product = getProductById(item.productId);
    return (
      product && item.ownedQuantity > 0 && product.dropTableId !== null // Only products with drop tables can be opened
    );
  });

  // P4-07: ownedCardIds is used as the starting set for dupe detection.
  // openPackBatch() clones this into a mutable set internally and tracks
  // new pulls across the batch, so dupe detection within a batch is correct.
  const ownedCardIds = useMemo(
    () => new Set(save.collection.map((c) => c.cardId)),
    [save.collection],
  );

  const handleOpenPack = useCallback(
    (productId: string) => {
      // P1-15: Guard against double-tap race — verify ownership before opening
      const invItem = save.inventory.find((i) => i.productId === productId);
      if (!invItem || invItem.ownedQuantity < 1) return;

      const dropTable = getDropTableForProduct(productId);
      if (!dropTable) return;

      setPageState("opening");

      // Run the pack opener
      const allCards = getAllCards();
      const result = openPack(
        dropTable,
        allCards,
        metaMap,
        ownedCardIds,
        eventMods.rarityBoostChance,
      );

      // Build reveal sequence
      const sorted = sortForReveal(result.pulls);
      const cards: RevealCard[] = [];
      for (const pull of sorted) {
        const card = getCardById(pull.cardId);
        if (!card) continue;
        cards.push({
          card,
          rarity: pull.rarity,
          isNew: pull.isNew,
          slotLabel: pull.slotLabel,
        });
      }

      // Add cards to collection
      const { newUniqueCount, duplicateCount } = addCardsToCollection(
        result.cardIds,
      );

      // Remove pack from inventory
      removeInventory(productId, 1);

      // Record in today's report
      recordPackOpened(newUniqueCount);

      setRevealCards(cards);
      setRevealIndex(0);
      setFlippedSet(new Set());
      setIsBatchMode(false);
      setLastStats({ newCount: newUniqueCount, dupeCount: duplicateCount });

      // Pack animation: shake (500ms) then burst (400ms) then reveal
      // Total opening animation ~ 900ms
      setTimeout(() => setPageState("reveal"), 900);
    },
    [
      save.inventory,
      metaMap,
      ownedCardIds,
      eventMods.rarityBoostChance,
      addCardsToCollection,
      removeInventory,
      recordPackOpened,
    ],
  );

  // Flip the current card, then after a delay move to the next (or summary)
  const handleTapReveal = useCallback(() => {
    // If current card isn't flipped yet, flip it
    if (!flippedSet.has(revealIndex)) {
      setFlippedSet((prev) => new Set(prev).add(revealIndex));
      return;
    }
    // Card is already flipped — advance to next or go to summary
    if (revealIndex < revealCards.length - 1) {
      setRevealIndex((i) => i + 1);
    } else {
      setPageState("summary");
    }
  }, [revealIndex, revealCards.length, flippedSet]);

  const handleOpenPackBatch = useCallback(
    (productId: string, count: number) => {
      // P1-15: Guard against double-tap race — verify ownership before batch opening
      const invItem = save.inventory.find((i) => i.productId === productId);
      if (!invItem || invItem.ownedQuantity < count) return;

      const dropTable = getDropTableForProduct(productId);
      if (!dropTable) return;

      setPageState("opening");

      const allCards = getAllCards();
      const batchResult = openPackBatch(
        count,
        dropTable,
        allCards,
        metaMap,
        ownedCardIds,
        eventMods.rarityBoostChance,
      );

      // Build reveal cards (sorted: commons first, showcases last)
      const sorted = sortForReveal(batchResult.pulls);
      const cards: RevealCard[] = [];
      for (const pull of sorted) {
        const card = getCardById(pull.cardId);
        if (!card) continue;
        cards.push({
          card,
          rarity: pull.rarity,
          isNew: pull.isNew,
          slotLabel: pull.slotLabel,
        });
      }

      // Add all cards to collection
      addCardsToCollection(batchResult.cardIds);

      // Remove packs from inventory
      removeInventory(productId, count);

      // Record each pack in today's report
      for (let i = 0; i < count; i++) {
        recordPackOpened(0); // bulk — we track new count globally via lastStats
      }

      setRevealCards(cards);
      setRevealIndex(0);
      setFlippedSet(new Set());
      setIsBatchMode(true);
      setLastStats({
        newCount: batchResult.newCount,
        dupeCount: batchResult.dupeCount,
      });

      setTimeout(() => setPageState("reveal"), 900);
    },
    [
      save.inventory,
      metaMap,
      ownedCardIds,
      eventMods.rarityBoostChance,
      addCardsToCollection,
      removeInventory,
      recordPackOpened,
    ],
  );

  const handleSkipToSummary = () => {
    if (autoAdvanceRef.current) {
      clearTimeout(autoAdvanceRef.current);
      autoAdvanceRef.current = null;
    }
    // Flip all cards and go to summary
    const allFlipped = new Set<number>();
    for (let i = 0; i < revealCards.length; i++) allFlipped.add(i);
    setFlippedSet(allFlipped);
    setRevealIndex(revealCards.length - 1);
    setPageState("summary");
  };

  const handleDone = () => {
    if (autoAdvanceRef.current) {
      clearTimeout(autoAdvanceRef.current);
      autoAdvanceRef.current = null;
    }
    setPageState("select");
    setRevealCards([]);
    setRevealIndex(0);
    setFlippedSet(new Set());
    setIsBatchMode(false);
    setLastStats(null);
  };

  // Auto-advance for batch mode: flip current card, wait, advance
  useEffect(() => {
    if (pageState !== "reveal" || !isBatchMode) return;

    const currentCard = revealCards[revealIndex];
    const isEpicPlus =
      currentCard &&
      (currentCard.rarity === "epic" || currentCard.rarity === "showcase");

    // If not flipped, auto-flip after a short delay
    if (!flippedSet.has(revealIndex)) {
      const flipDelay = 200;
      autoAdvanceRef.current = setTimeout(() => {
        setFlippedSet((prev) => new Set(prev).add(revealIndex));
      }, flipDelay);
      return () => {
        if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
      };
    }

    // If flipped, auto-advance to next (or summary)
    // Epic+ cards pause longer even in auto-advance
    const advanceDelay = isEpicPlus ? 1800 : 1200;
    autoAdvanceRef.current = setTimeout(() => {
      if (revealIndex < revealCards.length - 1) {
        setRevealIndex((i) => i + 1);
      } else {
        setPageState("summary");
      }
    }, advanceDelay);
    return () => {
      if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    };
  }, [pageState, isBatchMode, revealIndex, flippedSet, revealCards]);

  // ── Opening animation ────────────────────────────
  if (pageState === "opening") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4">
        <m.div
          className="border-accent-primary/50 bg-accent-primary/10 flex h-40 w-28 items-center justify-center rounded-xl border-2"
          animate={{
            rotate: [0, -3, 3, -2, 2, 0, 0, 0, 0],
            scale: [1, 1.02, 1.02, 1.01, 1.01, 1, 1, 1.15, 0],
            opacity: [1, 1, 1, 1, 1, 1, 1, 1, 0],
          }}
          transition={{
            duration: 0.9,
            ease: "easeInOut",
            times: [0, 0.1, 0.2, 0.3, 0.4, 0.55, 0.6, 0.75, 1],
          }}
        >
          <span className="text-accent-primary/60 text-3xl">?</span>
        </m.div>
        <m.p
          className="text-foreground-secondary mt-4 text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          Opening pack...
        </m.p>
      </div>
    );
  }

  // ── Reveal sequence (2A, 2B, 2C, 2E) ──────────────────
  if (pageState === "reveal" && revealCards.length > 0) {
    const currentCard = revealCards[revealIndex];
    const isFlipped = flippedSet.has(revealIndex);
    const isLastCard = revealIndex >= revealCards.length - 1;
    const progressPct = ((revealIndex + 1) / revealCards.length) * 100;
    const flipVariants = isBatchMode ? revealCardFlipFast : revealCardFlip;
    const detailVariants = isBatchMode
      ? cardDetailsSlideFast
      : cardDetailsSlide;

    return (
      <div
        className="flex flex-1 flex-col px-4 pt-4 pb-4"
        onClick={handleTapReveal}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === " " || e.key === "Enter") handleTapReveal();
        }}
      >
        {/* 2C: Counter pill + progress bar */}
        <m.div
          className="mx-auto mb-3 flex flex-col items-center gap-1.5"
          variants={counterPillVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="bg-card-background border-card-border flex items-center gap-2 rounded-full border px-3 py-1">
            <span className="text-foreground-secondary text-xs font-medium">
              {revealIndex + 1} / {revealCards.length}
            </span>
            {lastStats && (
              <>
                <span className="bg-card-border h-3 w-px" />
                <span className="text-xs">
                  <span className="font-medium text-green-400">
                    {lastStats.newCount} new
                  </span>
                </span>
              </>
            )}
          </div>
          <div className="reveal-counter-bar w-32">
            <div
              className="reveal-counter-fill"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </m.div>

        {/* 2A: Full-screen card — 70% width */}
        <div
          className="relative mb-4 flex flex-1 items-center justify-center"
          style={{ perspective: 1200 }}
        >
          <AnimatePresence mode="wait">
            <m.div
              key={revealIndex}
              className="preserve-3d relative w-[70vw] max-w-[280px]"
              style={{ aspectRatio: "5 / 7" }}
              variants={flipVariants}
              initial="hidden"
              animate={isFlipped ? "visible" : "hidden"}
            >
              {/* 2B: Rarity burst effect (behind card) */}
              {isFlipped && <RarityBurst rarity={currentCard.rarity} />}

              {/* Back face */}
              <div
                className={`absolute inset-0 overflow-hidden rounded-2xl border-2 backface-hidden ${getRarityBorderClass(currentCard.rarity)}`}
              >
                <Image
                  src="/images/card-back.png"
                  alt="Card back"
                  fill
                  sizes="70vw"
                  className="object-cover"
                  priority
                />
              </div>

              {/* Front face */}
              <div
                className={`absolute inset-0 rotate-y-180 overflow-hidden rounded-2xl border-2 backface-hidden ${getRarityBorderClass(currentCard.rarity)} ${getRarityGlowClass(currentCard.rarity)}`}
              >
                <Image
                  src={currentCard.card.imageUrl}
                  alt={currentCard.card.name}
                  fill
                  sizes="70vw"
                  className="object-cover"
                />
                {/* Showcase shimmer overlay */}
                {currentCard.rarity === "showcase" && (
                  <div className="showcase-shimmer-overlay" />
                )}
                {/* 2C: NEW badge with bounce */}
                {currentCard.isNew && (
                  <m.span
                    className="new-badge-sparkle absolute top-3 right-3 rounded-md bg-green-500/90 px-2 py-0.5 text-xs font-bold text-white shadow-lg"
                    variants={newBadgeBounce}
                    initial="hidden"
                    animate={isFlipped ? "visible" : "hidden"}
                  >
                    NEW
                  </m.span>
                )}
              </div>
            </m.div>
          </AnimatePresence>

          {/* 2B: Screen flash for epic/showcase */}
          {isFlipped && currentCard.rarity === "epic" && (
            <div className="screen-flash-epic" />
          )}
          {isFlipped && currentCard.rarity === "showcase" && (
            <div className="screen-flash-showcase" />
          )}
        </div>

        {/* Card details (appear after flip) */}
        <AnimatePresence mode="wait">
          {isFlipped && (
            <m.div
              key={`details-${revealIndex}`}
              className="mb-4 text-center"
              variants={detailVariants}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
            >
              <p className="text-lg font-bold">{currentCard.card.name}</p>
              <div className="mt-1 flex items-center justify-center gap-2 text-xs">
                <span className={getRarityTextClass(currentCard.rarity)}>
                  {currentCard.rarity.charAt(0).toUpperCase() +
                    currentCard.rarity.slice(1)}
                </span>
                <span className="text-foreground-muted">
                  {currentCard.card.setName}
                </span>
                <span className="text-foreground-muted">
                  {currentCard.card.cardType}
                </span>
              </div>
            </m.div>
          )}
        </AnimatePresence>

        {/* Bottom actions */}
        <div className="flex gap-3" onClick={(e) => e.stopPropagation()}>
          {!isFlipped ? (
            <m.button
              onClick={handleTapReveal}
              className="bg-accent-primary hover:bg-accent-primary-hover min-h-[44px] flex-1 rounded-xl py-3 text-sm font-medium text-white transition-colors"
              whileTap={{ scale: 0.97 }}
            >
              Tap to Reveal
            </m.button>
          ) : isLastCard ? (
            <m.button
              onClick={() => setPageState("summary")}
              className="bg-accent-primary hover:bg-accent-primary-hover min-h-[44px] flex-1 rounded-xl py-3 text-sm font-medium text-white transition-colors"
              whileTap={{ scale: 0.97 }}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              View Summary
            </m.button>
          ) : (
            <>
              <m.button
                onClick={handleTapReveal}
                className="bg-accent-primary hover:bg-accent-primary-hover min-h-[44px] flex-1 rounded-xl py-3 text-sm font-medium text-white transition-colors"
                whileTap={{ scale: 0.97 }}
              >
                Next Card
              </m.button>
              <m.button
                onClick={handleSkipToSummary}
                className="border-card-border bg-card-background text-foreground-secondary hover:bg-card-hover min-h-[44px] rounded-xl border px-4 py-3 text-sm font-medium transition-colors"
                whileTap={{ scale: 0.97 }}
              >
                Skip
              </m.button>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Summary screen (2D) ────────────────────────────
  if (pageState === "summary" && revealCards.length > 0) {
    return (
      <m.div
        className="flex flex-1 flex-col px-4 pt-6 pb-4"
        variants={fadeSlideUp}
        initial="initial"
        animate="animate"
      >
        {/* Summary header */}
        <div className="mb-4 text-center">
          <h2 className="text-xl font-bold">Pack Summary</h2>
          {lastStats && (
            <p className="text-foreground-secondary mt-1 text-sm">
              {revealCards.length} cards
              {" \u2022 "}
              <span className="font-medium text-green-400">
                {lastStats.newCount} new
              </span>
              {" \u2022 "}
              <span className="text-foreground-muted">
                {lastStats.dupeCount} dupes
              </span>
            </p>
          )}
        </div>

        {/* Card grid with stagger */}
        <m.div
          className="mb-4 grid grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4"
          variants={summaryStaggerContainer}
          initial="hidden"
          animate="visible"
        >
          {revealCards.map((c, i) => (
            <m.div
              key={i}
              className={`relative overflow-hidden rounded-xl border-2 ${getRarityBorderClass(c.rarity)} ${getRarityGlowClass(c.rarity)}`}
              style={{ aspectRatio: "5 / 7" }}
              variants={summaryStaggerItem}
            >
              <Image
                src={c.card.imageUrl}
                alt={c.card.name}
                fill
                sizes="30vw"
                className="object-cover"
                unoptimized
              />
              {c.isNew && (
                <span className="new-badge-sparkle absolute top-1 right-1 rounded bg-green-500/90 px-1 py-0.5 text-[9px] font-bold text-white">
                  NEW
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-1.5 pt-4 pb-1.5">
                <p className="truncate text-[10px] font-medium text-white">
                  {c.card.name}
                </p>
                <p className={`text-[9px] ${getRarityTextClass(c.rarity)}`}>
                  {c.rarity.charAt(0).toUpperCase() + c.rarity.slice(1)}
                </p>
              </div>
            </m.div>
          ))}
        </m.div>

        {/* Done button */}
        <m.button
          onClick={handleDone}
          className="bg-accent-primary hover:bg-accent-primary-hover mt-auto min-h-[44px] w-full rounded-xl py-3 text-sm font-medium text-white transition-colors"
          whileTap={{ scale: 0.97 }}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 400 }}
        >
          Done
        </m.button>
      </m.div>
    );
  }

  // ── Pack selection ───────────────────────────────
  return (
    <m.div
      className="flex flex-1 flex-col px-4 pt-6 pb-4"
      variants={fadeSlideUp}
      initial="initial"
      animate="animate"
    >
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Pack Opening</h1>
        <p className="text-foreground-secondary mt-1 text-sm">
          Open packs to discover new cards for your collection.
        </p>
        {eventMods.rarityBoostChance > 0 && (
          <div className="mt-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-1.5">
            <p className="text-xs text-yellow-300">
              Lucky boost active! +
              {Math.round(eventMods.rarityBoostChance * 100)}% rarity upgrade
              chance
            </p>
          </div>
        )}
      </div>

      {/* Available packs */}
      <section className="mb-6">
        <h2 className="mb-3 text-lg font-semibold">Available Packs</h2>
        {openablePacks.length === 0 ? (
          <div className="border-card-border bg-card-background rounded-xl border p-6 text-center">
            <div className="border-foreground-muted/30 mx-auto mb-4 flex h-20 w-14 items-center justify-center rounded-lg border-2 border-dashed">
              <span className="text-foreground-muted/50 text-2xl">?</span>
            </div>
            <p className="text-foreground-muted">
              No packs available. Buy some from the supplier!
            </p>
          </div>
        ) : (
          <m.div
            className="space-y-3"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {openablePacks.map((item) => {
              const product = getProductById(item.productId)!;
              return (
                <m.div
                  key={item.productId}
                  className="border-card-border bg-card-background flex items-center justify-between rounded-xl border p-4"
                  variants={staggerItem}
                >
                  <div>
                    <p className="font-medium">{product.name}</p>
                    <p className="text-foreground-secondary text-sm">
                      {product.cardsPerUnit} cards &middot; {item.ownedQuantity}{" "}
                      available
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {item.ownedQuantity >= 5 && (
                      <m.button
                        onClick={() => handleOpenPackBatch(item.productId, 5)}
                        className="border-accent-primary text-accent-primary hover:bg-accent-primary/10 min-h-[44px] rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors"
                        whileTap={{ scale: 0.95 }}
                      >
                        Open 5x
                      </m.button>
                    )}
                    <m.button
                      onClick={() => handleOpenPack(item.productId)}
                      className="bg-accent-primary hover:bg-accent-primary-hover min-h-[44px] rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-colors"
                      whileTap={{ scale: 0.95 }}
                    >
                      Open
                    </m.button>
                  </div>
                </m.div>
              );
            })}
          </m.div>
        )}
      </section>

      {/* Stats */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Stats</h2>
        <div className="border-card-border bg-card-background rounded-xl border p-4">
          <div className="grid grid-cols-2 gap-y-2 text-sm">
            <span className="text-foreground-secondary">
              Packs Opened Today
            </span>
            <span className="text-right font-medium">
              {save.todayReport.packsOpened}
            </span>
            <span className="text-foreground-secondary">
              Total Packs Opened
            </span>
            <span className="text-right font-medium">
              {save.stats.totalPacksOpened}
            </span>
            <span className="text-foreground-secondary">Unique Cards</span>
            <span className="text-right font-medium">
              {save.stats.uniqueCardsOwned}
            </span>
          </div>
        </div>
      </section>
    </m.div>
  );
}

// ── Rarity styling helpers ─────────────────────────

function getRarityBorderClass(rarity: Rarity): string {
  switch (rarity) {
    case "common":
      return "border-rarity-common/40";
    case "uncommon":
      return "border-rarity-uncommon/50";
    case "rare":
      return "border-rarity-rare/60";
    case "epic":
      return "border-rarity-epic/70";
    case "showcase":
      return "border-rarity-showcase/80";
    default:
      return "border-card-border";
  }
}

function getRarityBgClass(rarity: Rarity): string {
  switch (rarity) {
    case "common":
      return "bg-rarity-common/10";
    case "uncommon":
      return "bg-rarity-uncommon/10";
    case "rare":
      return "bg-rarity-rare/15";
    case "epic":
      return "bg-rarity-epic/15";
    case "showcase":
      return "bg-rarity-showcase/20";
    default:
      return "bg-card-background";
  }
}

function getRarityTextClass(rarity: Rarity): string {
  switch (rarity) {
    case "common":
      return "text-rarity-common";
    case "uncommon":
      return "text-rarity-uncommon";
    case "rare":
      return "text-rarity-rare";
    case "epic":
      return "text-rarity-epic";
    case "showcase":
      return "text-rarity-showcase";
    default:
      return "text-foreground-muted";
  }
}

function getRarityGlowClass(rarity: Rarity): string {
  switch (rarity) {
    case "rare":
      return "animate-rarity-rare";
    case "epic":
      return "animate-rarity-epic";
    case "showcase":
      return "animate-rarity-showcase";
    default:
      return "";
  }
}

// ── 2B: Rarity burst effect component ─────────────────

function RarityBurst({ rarity }: { rarity: Rarity }) {
  if (rarity === "rare") {
    return <div className="rarity-burst-rare" />;
  }
  if (rarity === "epic") {
    return (
      <>
        <div className="rarity-burst-epic" />
        <RarityParticles color="rgba(156, 39, 176, 0.8)" count={8} />
      </>
    );
  }
  if (rarity === "showcase") {
    return (
      <>
        <div className="rarity-burst-showcase" />
        <RarityParticles color="rgba(255, 152, 0, 0.9)" count={12} />
      </>
    );
  }
  return null;
}

/** Particle dots for epic/showcase reveals */
function RarityParticles({ color, count }: { color: string; count: number }) {
  // Generate deterministic-ish particle positions
  const particles = useMemo(() => {
    const result: Array<{
      x: number;
      y: number;
      delay: number;
      size: number;
    }> = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      result.push({
        x: Math.cos(angle) * (30 + (i % 3) * 15),
        y: Math.sin(angle) * (30 + (i % 3) * 15),
        delay: i * 0.05,
        size: 3 + (i % 3),
      });
    }
    return result;
  }, [count]);

  return (
    <>
      {particles.map((p, i) => (
        <span
          key={i}
          className="rarity-particle"
          style={{
            top: "50%",
            left: "50%",
            width: p.size,
            height: p.size,
            backgroundColor: color,
            animationDelay: `${p.delay}s`,
            // @ts-expect-error CSS custom properties
            "--particle-x": `${p.x}px`,
            "--particle-y": `${p.y}px`,
          }}
        />
      ))}
    </>
  );
}

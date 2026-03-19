"use client";

import { useGameStore } from "@/stores/game-store";
import {
  getProductById,
  getDropTableForProduct,
  getAllCards,
  getAllGameplayMeta,
} from "@/features/catalog";
import { openPack, sortForReveal } from "@/features/engine/pack-opener";
import {
  getActiveEvents,
  getCombinedEventModifiers,
} from "@/features/engine/events";
import type { CardDefinition, CardGameplayMeta, Rarity } from "@/types/game";
import { getCardById } from "@/features/catalog";
import { useState, useCallback, useMemo } from "react";
import { m, AnimatePresence } from "framer-motion";
import {
  cardFlip,
  staggerContainer,
  staggerItem,
  fadeSlideUp,
} from "@/lib/animations";

type PageState = "select" | "opening" | "reveal";

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

  const ownedCardIds = useMemo(
    () => new Set(save.collection.map((c) => c.cardId)),
    [save.collection],
  );

  const handleOpenPack = useCallback(
    (productId: string) => {
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
      setLastStats({ newCount: newUniqueCount, dupeCount: duplicateCount });

      // Pack animation: shake (500ms) then burst (400ms) then reveal
      // Total opening animation ~ 900ms
      setTimeout(() => setPageState("reveal"), 900);
    },
    [
      metaMap,
      ownedCardIds,
      eventMods.rarityBoostChance,
      addCardsToCollection,
      removeInventory,
      recordPackOpened,
    ],
  );

  const handleNextCard = () => {
    if (revealIndex < revealCards.length - 1) {
      setRevealIndex(revealIndex + 1);
    }
  };

  const handleRevealAll = () => {
    setRevealIndex(revealCards.length - 1);
  };

  const handleDone = () => {
    setPageState("select");
    setRevealCards([]);
    setRevealIndex(0);
    setLastStats(null);
  };

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

  // ── Reveal sequence ──────────────────────────────
  if (pageState === "reveal" && revealCards.length > 0) {
    const showingAll = revealIndex >= revealCards.length - 1;
    const currentCard = revealCards[revealIndex];
    const visibleCards = revealCards.slice(0, revealIndex + 1);

    return (
      <m.div
        className="flex flex-1 flex-col px-4 pt-6 pb-4"
        variants={fadeSlideUp}
        initial="initial"
        animate="animate"
      >
        {/* Progress */}
        <div className="mb-4 flex items-center justify-between">
          <span className="text-foreground-secondary text-sm">
            {revealIndex + 1} / {revealCards.length}
          </span>
          {lastStats && (
            <span className="text-sm">
              <span className="text-green-400">{lastStats.newCount} new</span>
              {" / "}
              <span className="text-foreground-muted">
                {lastStats.dupeCount} dupes
              </span>
            </span>
          )}
        </div>

        {/* Current card highlight */}
        <div className="mb-6 flex justify-center" style={{ perspective: 800 }}>
          <AnimatePresence mode="wait">
            <m.div
              key={revealIndex}
              className={`relative overflow-hidden rounded-xl border-2 p-4 ${getRarityBorderClass(currentCard.rarity)} ${getRarityGlowClass(currentCard.rarity)}`}
              variants={cardFlip}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
            >
              {currentCard.isNew && (
                <m.span
                  className="absolute top-2 right-2 rounded bg-green-500/90 px-1.5 py-0.5 text-[10px] font-bold text-white"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.4, type: "spring", stiffness: 500 }}
                >
                  NEW
                </m.span>
              )}
              <div className="h-44 w-32">
                <div
                  className={`flex h-full w-full flex-col items-center justify-center rounded-lg ${getRarityBgClass(currentCard.rarity)}`}
                >
                  <span className="text-[10px] tracking-wider uppercase opacity-70">
                    {currentCard.rarity}
                  </span>
                  <p className="mt-2 px-2 text-center text-sm leading-tight font-bold">
                    {currentCard.card.name}
                  </p>
                  <p className="text-foreground-secondary mt-1 text-[10px]">
                    {currentCard.card.setCode}-
                    {currentCard.card.collectorNumber}
                  </p>
                </div>
              </div>
            </m.div>
          </AnimatePresence>
        </div>

        {/* Card grid (all revealed so far) */}
        <m.div
          className="mb-4 grid grid-cols-4 gap-1.5 sm:grid-cols-5"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {visibleCards.map((c, i) => (
            <m.div
              key={i}
              className={`rounded-md border p-1.5 text-center ${getRarityBorderClass(c.rarity)} ${
                i === revealIndex ? "ring-1 ring-white/50" : "opacity-70"
              }`}
              variants={staggerItem}
            >
              <p className="truncate text-[10px] font-medium">{c.card.name}</p>
              <p
                className={`text-[10px] uppercase ${getRarityTextClass(c.rarity)}`}
              >
                {c.rarity}
              </p>
            </m.div>
          ))}
        </m.div>

        {/* Actions */}
        <div className="mt-auto flex gap-3">
          {!showingAll ? (
            <>
              <m.button
                onClick={handleNextCard}
                className="bg-accent-primary hover:bg-accent-primary-hover min-h-[44px] flex-1 rounded-xl py-3 text-sm font-medium text-white transition-colors"
                whileTap={{ scale: 0.97 }}
              >
                Next Card
              </m.button>
              <m.button
                onClick={handleRevealAll}
                className="border-card-border bg-card-background text-foreground-secondary hover:bg-card-hover min-h-[44px] rounded-xl border px-4 py-3 text-sm font-medium transition-colors"
                whileTap={{ scale: 0.97 }}
              >
                Reveal All
              </m.button>
            </>
          ) : (
            <m.button
              onClick={handleDone}
              className="bg-accent-primary hover:bg-accent-primary-hover min-h-[44px] flex-1 rounded-xl py-3 text-sm font-medium text-white transition-colors"
              whileTap={{ scale: 0.97 }}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              Done
            </m.button>
          )}
        </div>
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
                  <m.button
                    onClick={() => handleOpenPack(item.productId)}
                    className="bg-accent-primary hover:bg-accent-primary-hover min-h-[44px] rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-colors"
                    whileTap={{ scale: 0.95 }}
                  >
                    Open
                  </m.button>
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

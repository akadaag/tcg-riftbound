"use client";

import { useState, useMemo, useCallback } from "react";
import { useGameStore } from "@/stores/game-store";
import {
  getAllCards,
  getCardsByRarity,
  getGameplayMeta,
  getCardById,
} from "@/features/catalog";
import {
  TRADE_RATIO,
  TRADER_UNLOCK_LEVEL,
  TRADEABLE_RARITIES,
  TRADE_PATHS,
  getTradeableCards,
  getTradeLanes,
  executeTrade,
} from "@/features/trader";
import type { Rarity } from "@/types/game";
import type { TradeableCard, TradeResult } from "@/features/trader";
import Link from "next/link";

// ── Rarity color map ─────────────────────────────────────────────────

const RARITY_COLORS: Record<Rarity, string> = {
  common: "text-gray-300",
  uncommon: "text-green-400",
  rare: "text-blue-400",
  epic: "text-purple-400",
  showcase: "text-yellow-400",
};

const RARITY_BG: Record<Rarity, string> = {
  common: "bg-gray-500/20 border-gray-500/30",
  uncommon: "bg-green-500/20 border-green-500/30",
  rare: "bg-blue-500/20 border-blue-500/30",
  epic: "bg-purple-500/20 border-purple-500/30",
  showcase: "bg-yellow-500/20 border-yellow-500/30",
};

const RARITY_LABEL: Record<Rarity, string> = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  epic: "Epic",
  showcase: "Showcase",
};

// ── Page Component ───────────────────────────────────────────────────

export default function CardTraderPage() {
  const { save, tradeCards } = useGameStore();
  const [selectedRarity, setSelectedRarity] = useState<Rarity | null>(null);
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [tradeResult, setTradeResult] = useState<TradeResult | null>(null);
  const [showResult, setShowResult] = useState(false);

  const isLocked = save.shopLevel < TRADER_UNLOCK_LEVEL;

  // Build card lookup maps once
  const cardMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof getCardById>>();
    for (const card of getAllCards()) {
      map.set(card.id, card);
    }
    return map as Map<string, NonNullable<ReturnType<typeof getCardById>>>;
  }, []);

  const metaMap = useMemo(() => {
    const map = new Map<
      string,
      NonNullable<ReturnType<typeof getGameplayMeta>>
    >();
    for (const card of getAllCards()) {
      const meta = getGameplayMeta(card.id);
      if (meta) map.set(card.id, meta);
    }
    return map;
  }, []);

  // Get trade lane info
  const tradeLanes = useMemo(
    () => getTradeLanes(save.collection, cardMap),
    [save.collection, cardMap],
  );

  // Get tradeable cards for the selected rarity
  const tradeableCards = useMemo(() => {
    if (!selectedRarity) return [];
    return getTradeableCards(save.collection, selectedRarity, cardMap);
  }, [save.collection, selectedRarity, cardMap]);

  // How many times each card ID is in the selection
  const selectionCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const id of selectedCards) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return counts;
  }, [selectedCards]);

  const handleSelectCard = useCallback(
    (cardId: string, maxExcess: number) => {
      const currentCount = selectedCards.filter((id) => id === cardId).length;
      if (selectedCards.length >= TRADE_RATIO) return;

      // Can't select more copies than excess
      const entry = save.collection.find((c) => c.cardId === cardId);
      if (!entry) return;
      const excess = entry.copiesOwned - 1;
      if (currentCount >= excess) return;

      setSelectedCards((prev) => [...prev, cardId]);
    },
    [selectedCards, save.collection],
  );

  const handleDeselectCard = useCallback((cardId: string) => {
    setSelectedCards((prev) => {
      const idx = prev.lastIndexOf(cardId);
      if (idx === -1) return prev;
      return [...prev.slice(0, idx), ...prev.slice(idx + 1)];
    });
  }, []);

  const handleTrade = useCallback(() => {
    if (!selectedRarity || selectedCards.length !== TRADE_RATIO) return;

    const targetRarity = TRADE_PATHS[selectedRarity];
    const targetCards = getCardsByRarity(targetRarity);

    const result = executeTrade(
      selectedCards,
      selectedRarity,
      save.collection,
      cardMap,
      targetCards,
      metaMap,
    );

    if (typeof result === "string") {
      // Error — shouldn't happen if UI is correct
      console.error("[trader] Trade error:", result);
      return;
    }

    // Apply to store
    tradeCards(selectedCards, result.resultCard.id);
    setTradeResult(result);
    setShowResult(true);
    setSelectedCards([]);
  }, [
    selectedRarity,
    selectedCards,
    save.collection,
    cardMap,
    metaMap,
    tradeCards,
  ]);

  const handleCloseResult = useCallback(() => {
    setShowResult(false);
    setTradeResult(null);
  }, []);

  const handleBackToLanes = useCallback(() => {
    setSelectedRarity(null);
    setSelectedCards([]);
  }, []);

  // ── Locked State ────────────────────────────────────────────────────

  if (isLocked) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4">
        <div className="mb-4 text-5xl">🔒</div>
        <h1 className="mb-2 text-xl font-bold">Card Trader Locked</h1>
        <p className="text-foreground-secondary mb-6 text-center text-sm">
          Reach shop level {TRADER_UNLOCK_LEVEL} to unlock the Card Trader.
          <br />
          Trade 5 duplicate cards for 1 card of the next rarity!
        </p>
        <p className="text-foreground-muted text-sm">
          Current level: {save.shopLevel}
        </p>
        <Link
          href="/more"
          className="text-accent-primary mt-6 flex min-h-[44px] items-center px-1 py-2 text-sm"
        >
          &larr; Back to More
        </Link>
      </div>
    );
  }

  // ── Trade Result Modal ──────────────────────────────────────────────

  if (showResult && tradeResult) {
    const resultCard = tradeResult.resultCard;
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <p className="text-foreground-secondary mb-2 text-sm tracking-wider uppercase">
            Trade Complete!
          </p>

          {/* Result card */}
          <div
            className={`mx-auto mb-4 rounded-xl border p-4 ${RARITY_BG[resultCard.rarity]}`}
          >
            <div className="relative mx-auto mb-3 aspect-[2.5/3.5] w-32 overflow-hidden rounded-lg bg-black/30">
              <img
                src={resultCard.imageUrl}
                alt={resultCard.name}
                className="h-full w-full object-cover"
              />
            </div>
            <p
              className={`text-lg font-bold ${RARITY_COLORS[resultCard.rarity]}`}
            >
              {resultCard.name}
            </p>
            <p className="text-foreground-secondary text-sm">
              {RARITY_LABEL[resultCard.rarity]} &middot; {resultCard.setName}
            </p>
            {tradeResult.isNew && (
              <span className="mt-2 inline-block rounded-full bg-green-500/20 px-3 py-1 text-xs font-bold text-green-400">
                NEW!
              </span>
            )}
          </div>

          <button
            onClick={handleCloseResult}
            className="bg-accent-primary hover:bg-accent-primary/80 min-h-[44px] w-full rounded-xl px-6 py-3 font-medium text-white transition-colors"
          >
            Continue Trading
          </button>
        </div>
      </div>
    );
  }

  // ── Card Picker ─────────────────────────────────────────────────────

  if (selectedRarity) {
    const targetRarity = TRADE_PATHS[selectedRarity];

    return (
      <div className="flex flex-1 flex-col px-4 pt-6 pb-4">
        {/* Header */}
        <div className="mb-4">
          <button
            onClick={handleBackToLanes}
            className="text-accent-primary mb-2 min-h-[44px] px-1 py-2 text-sm"
          >
            &larr; Back to Trade Lanes
          </button>
          <h1 className="text-xl font-bold">
            Trade{" "}
            <span className={RARITY_COLORS[selectedRarity]}>
              {RARITY_LABEL[selectedRarity]}
            </span>{" "}
            &rarr;{" "}
            <span className={RARITY_COLORS[targetRarity]}>
              {RARITY_LABEL[targetRarity]}
            </span>
          </h1>
          <p className="text-foreground-secondary mt-1 text-sm">
            Select {TRADE_RATIO} cards to sacrifice. You keep at least 1 copy of
            each.
          </p>
        </div>

        {/* Selection counter */}
        <div className="border-card-border bg-card-background mb-4 rounded-xl border p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              Selected: {selectedCards.length}/{TRADE_RATIO}
            </span>
            {selectedCards.length === TRADE_RATIO ? (
              <button
                onClick={handleTrade}
                className="bg-accent-primary hover:bg-accent-primary/80 min-h-[44px] rounded-lg px-4 py-2 text-sm font-bold text-white transition-colors"
              >
                Trade!
              </button>
            ) : (
              <span className="text-foreground-muted text-sm">
                {TRADE_RATIO - selectedCards.length} more needed
              </span>
            )}
          </div>

          {/* Selected cards pills */}
          {selectedCards.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {selectedCards.map((cardId, idx) => {
                const card = cardMap.get(cardId);
                return (
                  <button
                    key={`${cardId}-${idx}`}
                    onClick={() => handleDeselectCard(cardId)}
                    className={`min-h-[36px] rounded-lg border px-2.5 py-1.5 text-xs ${RARITY_BG[selectedRarity]}`}
                  >
                    {card?.name ?? "?"} &times;
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Tradeable card list */}
        <div className="flex-1 space-y-2 overflow-y-auto pb-20">
          {tradeableCards.length === 0 ? (
            <p className="text-foreground-muted py-8 text-center text-sm">
              No {RARITY_LABEL[selectedRarity].toLowerCase()} cards with 2+
              copies.
            </p>
          ) : (
            tradeableCards.map((tc) => {
              const selectedCount = selectionCounts.get(tc.card.id) ?? 0;
              const remainingExcess = tc.excessCopies - selectedCount;
              const canSelect =
                remainingExcess > 0 && selectedCards.length < TRADE_RATIO;

              return (
                <TradeableCardRow
                  key={tc.card.id}
                  tc={tc}
                  selectedCount={selectedCount}
                  canSelect={canSelect}
                  onSelect={() => handleSelectCard(tc.card.id, tc.excessCopies)}
                  onDeselect={() => handleDeselectCard(tc.card.id)}
                  rarity={selectedRarity}
                />
              );
            })
          )}
        </div>
      </div>
    );
  }

  // ── Trade Lanes (main view) ─────────────────────────────────────────

  return (
    <div className="flex flex-1 flex-col px-4 pt-6 pb-4">
      <div className="mb-2">
        <Link
          href="/more"
          className="text-accent-primary inline-flex min-h-[44px] items-center px-1 py-2 text-sm"
        >
          &larr; Back to More
        </Link>
      </div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Card Trader</h1>
        <p className="text-foreground-secondary mt-1 text-sm">
          Trade {TRADE_RATIO} duplicate cards for 1 card of the next rarity.
        </p>
        <p className="text-foreground-muted mt-1 text-xs">
          Trades completed: {save.stats.totalTradesCompleted}
        </p>
      </div>

      {/* Trade lanes */}
      <div className="space-y-3">
        {tradeLanes.map((lane) => (
          <button
            key={lane.sourceRarity}
            onClick={() =>
              lane.canTrade && setSelectedRarity(lane.sourceRarity)
            }
            disabled={!lane.canTrade}
            className={`w-full rounded-xl border p-4 text-left transition-all ${
              lane.canTrade
                ? `${RARITY_BG[lane.sourceRarity]} hover:brightness-110 active:scale-[0.99]`
                : "border-card-border bg-card-background opacity-50"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">
                  <span className={RARITY_COLORS[lane.sourceRarity]}>
                    {RARITY_LABEL[lane.sourceRarity]}
                  </span>{" "}
                  &rarr;{" "}
                  <span className={RARITY_COLORS[lane.targetRarity]}>
                    {RARITY_LABEL[lane.targetRarity]}
                  </span>
                </p>
                <p className="text-foreground-secondary mt-0.5 text-sm">
                  {lane.totalExcess} excess{" "}
                  {lane.totalExcess === 1 ? "copy" : "copies"} across{" "}
                  {lane.tradeableCardCount}{" "}
                  {lane.tradeableCardCount === 1 ? "card" : "cards"}
                </p>
              </div>
              <div className="text-right">
                {lane.canTrade ? (
                  <span className="text-accent-primary text-sm font-bold">
                    {Math.floor(lane.totalExcess / TRADE_RATIO)} trade
                    {Math.floor(lane.totalExcess / TRADE_RATIO) !== 1
                      ? "s"
                      : ""}{" "}
                    available
                  </span>
                ) : (
                  <span className="text-foreground-muted text-sm">
                    Need {Math.max(0, TRADE_RATIO - lane.totalExcess)} more
                  </span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* How it works */}
      <div className="border-card-border bg-card-background mt-6 rounded-xl border p-4">
        <h3 className="mb-2 text-sm font-semibold">How it works</h3>
        <ul className="text-foreground-secondary space-y-1.5 text-xs">
          <li>&bull; Select {TRADE_RATIO} cards of one rarity to sacrifice</li>
          <li>&bull; You always keep at least 1 copy of each card</li>
          <li>&bull; Receive 1 random card of the next rarity</li>
          <li>&bull; Cards you don&apos;t own yet are more likely to appear</li>
        </ul>
      </div>
    </div>
  );
}

// ── Subcomponents ────────────────────────────────────────────────────

function TradeableCardRow({
  tc,
  selectedCount,
  canSelect,
  onSelect,
  onDeselect,
  rarity,
}: {
  tc: TradeableCard;
  selectedCount: number;
  canSelect: boolean;
  onSelect: () => void;
  onDeselect: () => void;
  rarity: Rarity;
}) {
  return (
    <div
      className={`border-card-border bg-card-background flex items-center gap-3 rounded-xl border p-3 transition-all ${
        selectedCount > 0 ? "ring-accent-primary/50 ring-2" : ""
      }`}
    >
      {/* Card thumbnail */}
      <div className="h-14 w-10 flex-shrink-0 overflow-hidden rounded-md bg-black/30">
        <img
          src={tc.card.imageUrl}
          alt={tc.card.name}
          className="h-full w-full object-cover"
        />
      </div>

      {/* Card info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{tc.card.name}</p>
        <p className="text-foreground-secondary text-xs">
          {tc.copiesOwned} owned &middot; {tc.excessCopies - selectedCount}{" "}
          tradeable
        </p>
      </div>

      {/* Selection controls */}
      <div className="flex items-center gap-1.5">
        {selectedCount > 0 && (
          <button
            onClick={onDeselect}
            className="flex h-9 min-h-[36px] w-9 items-center justify-center rounded-lg bg-red-500/20 text-red-400 transition-colors hover:bg-red-500/30"
          >
            -
          </button>
        )}
        {selectedCount > 0 && (
          <span className="w-6 text-center text-sm font-bold">
            {selectedCount}
          </span>
        )}
        <button
          onClick={onSelect}
          disabled={!canSelect}
          className={`flex h-9 min-h-[36px] w-9 items-center justify-center rounded-lg transition-colors ${
            canSelect
              ? `${RARITY_BG[rarity]} hover:brightness-125`
              : "bg-card-border text-foreground-muted opacity-40"
          }`}
        >
          +
        </button>
      </div>
    </div>
  );
}

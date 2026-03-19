"use client";

import { useState, useMemo, useCallback } from "react";
import { useGameStore } from "@/stores/game-store";
import { getCardById, getGameplayMeta, getAllCards } from "@/features/catalog";
import {
  MAX_SINGLES_SLOTS,
  SINGLES_UNLOCK_LEVEL,
  calculateSuggestedPrice,
  calculateAskingPrice,
  getListableCards,
} from "@/features/singles";
import type { ListableCard } from "@/features/singles";
import type { Rarity } from "@/types/game";
import Link from "next/link";

// ── Rarity styling ──────────────────────────────────────────────────

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

// ── Page Component ──────────────────────────────────────────────────

export default function SinglesCounterPage() {
  const { save, listSingle, unlistSingle } = useGameStore();
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [markups, setMarkups] = useState<Record<string, number>>({});

  const isLocked = save.shopLevel < SINGLES_UNLOCK_LEVEL;
  const slotsUsed = save.singlesListings.length;
  const slotsRemaining = MAX_SINGLES_SLOTS - slotsUsed;

  // Build lookup functions
  const cardLookup = useCallback((id: string) => getCardById(id), []);
  const metaLookup = useCallback((id: string) => getGameplayMeta(id), []);

  // Average hype across all sets as a simple multiplier
  const hypeMultiplier = useMemo(() => {
    if (save.setHype.length === 0) return 1.0;
    const avgHype =
      save.setHype.reduce((sum, h) => sum + h.currentHype, 0) /
      save.setHype.length;
    // Map 0-100 hype to 0.5-1.5 multiplier
    return 0.5 + avgHype / 100;
  }, [save.setHype]);

  // Get listable cards (cards with 2+ copies, not already listed)
  const listableCards = useMemo(
    () =>
      getListableCards(
        save.collection,
        save.singlesListings,
        cardLookup,
        metaLookup,
        hypeMultiplier,
      ),
    [
      save.collection,
      save.singlesListings,
      cardLookup,
      metaLookup,
      hypeMultiplier,
    ],
  );

  // Enrich active listings with card data
  const activeListings = useMemo(() => {
    return save.singlesListings
      .map((listing) => {
        const card = getCardById(listing.cardId);
        const meta = getGameplayMeta(listing.cardId);
        return card && meta ? { listing, card, meta } : null;
      })
      .filter(Boolean) as {
      listing: (typeof save.singlesListings)[number];
      card: NonNullable<ReturnType<typeof getCardById>>;
      meta: NonNullable<ReturnType<typeof getGameplayMeta>>;
    }[];
  }, [save.singlesListings]);

  const getMarkup = (cardId: string) => markups[cardId] ?? 0;

  const setMarkup = (cardId: string, value: number) => {
    setMarkups((prev) => ({ ...prev, [cardId]: value }));
  };

  const handleList = useCallback(
    (lc: ListableCard) => {
      const markup = markups[lc.card.id] ?? 0;
      const askingPrice = calculateAskingPrice(lc.suggestedPrice, markup);
      const success = listSingle(lc.card.id, askingPrice);
      if (success) {
        setExpandedCard(null);
        // Clear markup for this card
        setMarkups((prev) => {
          const next = { ...prev };
          delete next[lc.card.id];
          return next;
        });
      }
    },
    [markups, listSingle],
  );

  const handleUnlist = useCallback(
    (cardId: string) => {
      unlistSingle(cardId);
    },
    [unlistSingle],
  );

  // ── Locked State ──────────────────────────────────────────────────

  if (isLocked) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4">
        <div className="mb-4 text-5xl">🔒</div>
        <h1 className="mb-2 text-xl font-bold">Singles Counter Locked</h1>
        <p className="text-foreground-secondary mb-6 text-center text-sm">
          Reach shop level {SINGLES_UNLOCK_LEVEL} to unlock the Singles Counter.
          <br />
          Sell individual cards from your collection for profit!
        </p>
        <p className="text-foreground-muted text-sm">
          Current level: {save.shopLevel}
        </p>
        <Link
          href="/shop"
          className="text-accent-primary mt-6 flex min-h-[44px] items-center px-1 py-2 text-sm"
        >
          &larr; Back to Shop
        </Link>
      </div>
    );
  }

  // ── Main View ─────────────────────────────────────────────────────

  return (
    <div className="flex flex-1 flex-col px-4 pt-6 pb-4">
      {/* Header */}
      <div className="mb-2">
        <Link
          href="/shop"
          className="text-accent-primary inline-flex min-h-[44px] items-center px-1 py-2 text-sm"
        >
          &larr; Back to Shop
        </Link>
      </div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Singles Counter</h1>
        <p className="text-foreground-secondary mt-1 text-sm">
          List individual cards for sale to collectors and competitive players.
        </p>
        <div className="mt-2 flex items-center gap-3">
          <span className="text-foreground-muted text-sm">
            Slots: {slotsUsed}/{MAX_SINGLES_SLOTS}
          </span>
          <span className="text-foreground-muted text-xs">
            Total sold: {save.stats.totalSinglesSold}
          </span>
          <span className="text-currency-gold text-xs font-medium">
            Earned: {save.stats.totalSinglesRevenue.toLocaleString()} G
          </span>
        </div>
      </div>

      {/* Active Listings */}
      {activeListings.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 text-lg font-semibold">
            Active Listings ({activeListings.length})
          </h2>
          <div className="space-y-2">
            {activeListings.map(({ listing, card, meta }) => (
              <div
                key={listing.cardId}
                className="border-card-border bg-card-background flex items-center gap-3 rounded-xl border p-3"
              >
                {/* Card thumbnail */}
                <div className="h-14 w-10 flex-shrink-0 overflow-hidden rounded-md bg-black/30">
                  <img
                    src={card.imageUrl}
                    alt={card.name}
                    className="h-full w-full object-cover"
                  />
                </div>

                {/* Card info */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{card.name}</p>
                  <p className="text-foreground-secondary text-xs">
                    <span className={RARITY_COLORS[card.rarity]}>
                      {RARITY_LABEL[card.rarity]}
                    </span>
                    {" · "}
                    {card.setName}
                  </p>
                </div>

                {/* Price + Unlist */}
                <div className="flex items-center gap-2">
                  <span className="text-currency-gold text-sm font-bold">
                    {listing.askingPrice.toLocaleString()} G
                  </span>
                  <button
                    onClick={() => handleUnlist(listing.cardId)}
                    className="min-h-[44px] rounded-lg bg-red-500/20 px-3 py-2 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/30"
                  >
                    Unlist
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Available to List */}
      <section className="flex-1">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Available to List</h2>
          {slotsRemaining > 0 ? (
            <span className="text-foreground-muted text-xs">
              {slotsRemaining} slot{slotsRemaining !== 1 ? "s" : ""} remaining
            </span>
          ) : (
            <span className="text-xs font-medium text-red-400">
              All slots full
            </span>
          )}
        </div>

        {listableCards.length === 0 ? (
          <div className="border-card-border bg-card-background rounded-xl border p-6 text-center">
            <p className="text-foreground-muted text-sm">
              {slotsRemaining === 0
                ? "All listing slots are full. Unlist a card to free up a slot."
                : "No cards available to list. You need 2+ copies of a card (you always keep 1)."}
            </p>
          </div>
        ) : (
          <div className="space-y-2 pb-20">
            {listableCards.map((lc) => {
              const isExpanded = expandedCard === lc.card.id;
              const markup = getMarkup(lc.card.id);
              const askingPrice = calculateAskingPrice(
                lc.suggestedPrice,
                markup,
              );
              const canList = slotsRemaining > 0;

              return (
                <ListableCardRow
                  key={lc.card.id}
                  lc={lc}
                  isExpanded={isExpanded}
                  markup={markup}
                  askingPrice={askingPrice}
                  canList={canList}
                  onToggle={() =>
                    setExpandedCard(isExpanded ? null : lc.card.id)
                  }
                  onMarkupChange={(v) => setMarkup(lc.card.id, v)}
                  onList={() => handleList(lc)}
                />
              );
            })}
          </div>
        )}
      </section>

      {/* How it works */}
      <div className="border-card-border bg-card-background mt-4 rounded-xl border p-4">
        <h3 className="mb-2 text-sm font-semibold">How it works</h3>
        <ul className="text-foreground-secondary space-y-1.5 text-xs">
          <li>&bull; List cards you own 2+ copies of (you always keep 1)</li>
          <li>&bull; Set your price using the markup slider</li>
          <li>
            &bull; Collectors and competitive players may buy your singles each
            day
          </li>
          <li>&bull; Higher rarity and lower markup = faster sales</li>
        </ul>
      </div>
    </div>
  );
}

// ── Subcomponents ───────────────────────────────────────────────────

function ListableCardRow({
  lc,
  isExpanded,
  markup,
  askingPrice,
  canList,
  onToggle,
  onMarkupChange,
  onList,
}: {
  lc: ListableCard;
  isExpanded: boolean;
  markup: number;
  askingPrice: number;
  canList: boolean;
  onToggle: () => void;
  onMarkupChange: (value: number) => void;
  onList: () => void;
}) {
  return (
    <div
      className={`border-card-border bg-card-background rounded-xl border transition-all ${
        isExpanded ? "ring-accent-primary/50 ring-2" : ""
      }`}
    >
      {/* Card row — tap to expand */}
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-3 p-3 text-left"
      >
        {/* Thumbnail */}
        <div className="h-14 w-10 flex-shrink-0 overflow-hidden rounded-md bg-black/30">
          <img
            src={lc.card.imageUrl}
            alt={lc.card.name}
            className="h-full w-full object-cover"
          />
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{lc.card.name}</p>
          <p className="text-foreground-secondary text-xs">
            <span className={RARITY_COLORS[lc.card.rarity]}>
              {RARITY_LABEL[lc.card.rarity]}
            </span>
            {" · "}
            {lc.copiesOwned} owned
          </p>
        </div>

        {/* Suggested price */}
        <div className="text-right">
          <p className="text-currency-gold text-sm font-bold">
            {lc.suggestedPrice.toLocaleString()} G
          </p>
          <p className="text-foreground-muted text-[10px]">suggested</p>
        </div>
      </button>

      {/* Expanded pricing controls */}
      {isExpanded && (
        <div className="border-card-border border-t px-3 pt-3 pb-4">
          {/* Markup slider */}
          <div className="mb-3">
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="text-foreground-secondary">Markup</span>
              <span className="font-medium">{markup}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={markup}
              onChange={(e) => onMarkupChange(Number(e.target.value))}
              className="accent-accent-primary w-full"
              aria-label={`Singles markup percentage: ${markup}%`}
            />
            <div className="text-foreground-muted mt-0.5 flex justify-between text-xs">
              <span>0% (fast sale)</span>
              <span>100% (max profit)</span>
            </div>
          </div>

          {/* Price summary */}
          <div className="mb-3 flex items-center justify-between">
            <span className="text-foreground-secondary text-sm">
              Asking price:
            </span>
            <span className="text-currency-gold text-lg font-bold">
              {askingPrice.toLocaleString()} G
            </span>
          </div>

          {/* List button */}
          <button
            onClick={onList}
            disabled={!canList}
            className={`min-h-[44px] w-full rounded-xl px-6 py-3 font-medium transition-colors ${
              canList
                ? "bg-accent-primary hover:bg-accent-primary/80 text-white"
                : "bg-card-border text-foreground-muted cursor-not-allowed"
            }`}
          >
            {canList ? "List for Sale" : "All Slots Full"}
          </button>
        </div>
      )}
    </div>
  );
}

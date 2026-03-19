"use client";

import { useGameStore } from "@/stores/game-store";
import {
  getAllSets,
  getCardsBySet,
  getBaseCardsBySet,
  getShowcaseCardsBySet,
  getCardById,
  getGameplayMeta,
} from "@/features/catalog";
import { getDisplayCaseCapacity } from "@/features/upgrades";
import type {
  Rarity,
  SetDefinition,
  CardDefinition,
  CollectionEntry,
} from "@/types/game";
import { useState, useMemo } from "react";

type ViewMode = "sets" | "cards";

export default function CollectionPage() {
  const { save, addToDisplayCase, removeFromDisplayCase } = useGameStore();
  const sets = getAllSets();
  const [viewMode, setViewMode] = useState<ViewMode>("sets");
  const [selectedSet, setSelectedSet] = useState<string | null>(null);
  const [detailCardId, setDetailCardId] = useState<string | null>(null);

  const ownedMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const entry of save.collection) {
      map.set(entry.cardId, entry.copiesOwned);
    }
    return map;
  }, [save.collection]);

  const collectionEntryMap = useMemo(() => {
    const map = new Map<string, CollectionEntry>();
    for (const entry of save.collection) {
      map.set(entry.cardId, entry);
    }
    return map;
  }, [save.collection]);

  const newCardIds = useMemo(
    () => new Set(save.collection.filter((c) => c.isNew).map((c) => c.cardId)),
    [save.collection],
  );

  // Total stats
  const totalUnique = save.stats.uniqueCardsOwned;
  const totalCards = save.stats.totalCardsCollected;
  const totalPossible = sets.reduce((acc, s) => acc + s.totalCardCount, 0);

  // Per-set completion
  const setStats = useMemo(() => {
    const map = new Map<
      string,
      {
        base: number;
        baseTotal: number;
        showcase: number;
        showcaseTotal: number;
      }
    >();
    for (const set of sets) {
      const baseCards = getBaseCardsBySet(set.setCode);
      const showcaseCards = getShowcaseCardsBySet(set.setCode);
      let baseOwned = 0;
      let showcaseOwned = 0;
      for (const card of baseCards) {
        if (ownedMap.has(card.id)) baseOwned++;
      }
      for (const card of showcaseCards) {
        if (ownedMap.has(card.id)) showcaseOwned++;
      }
      map.set(set.setCode, {
        base: baseOwned,
        baseTotal: baseCards.length,
        showcase: showcaseOwned,
        showcaseTotal: showcaseCards.length,
      });
    }
    return map;
  }, [sets, ownedMap]);

  // Display case
  const displayCaseCapacity = getDisplayCaseCapacity(save.upgrades);
  const displayCaseSet = useMemo(
    () => new Set(save.displayCase),
    [save.displayCase],
  );

  function handleToggleDisplayCase(cardId: string) {
    if (displayCaseSet.has(cardId)) {
      removeFromDisplayCase(cardId);
    } else if (save.displayCase.length < displayCaseCapacity) {
      addToDisplayCase(cardId);
    }
  }

  return (
    <div className="flex flex-1 flex-col px-4 pt-6 pb-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Collection</h1>
        <p className="text-foreground-secondary mt-1 text-sm">
          Your card binder — {totalUnique}/{totalPossible} unique cards
        </p>
      </div>

      {/* Overview stats */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <div className="border-card-border bg-card-background rounded-xl border p-3 text-center">
          <p className="text-foreground-muted text-xs">Total Cards</p>
          <p className="mt-1 text-xl font-bold">{totalCards}</p>
        </div>
        <div className="border-card-border bg-card-background rounded-xl border p-3 text-center">
          <p className="text-foreground-muted text-xs">Unique</p>
          <p className="mt-1 text-xl font-bold">
            {totalUnique}
            <span className="text-foreground-muted text-xs">
              /{totalPossible}
            </span>
          </p>
        </div>
        <div className="border-card-border bg-card-background rounded-xl border p-3 text-center">
          <p className="text-foreground-muted text-xs">Completion</p>
          <p className="mt-1 text-xl font-bold">
            {totalPossible > 0
              ? Math.round((totalUnique / totalPossible) * 100)
              : 0}
            %
          </p>
        </div>
      </div>

      {/* View toggle */}
      {selectedSet ? (
        <CardGridView
          setCode={selectedSet}
          ownedMap={ownedMap}
          newCardIds={newCardIds}
          onBack={() => setSelectedSet(null)}
          stats={setStats.get(selectedSet)!}
          set={sets.find((s) => s.setCode === selectedSet)!}
          onCardTap={setDetailCardId}
        />
      ) : (
        <SetListView
          sets={sets}
          setStats={setStats}
          onSelectSet={(code) => setSelectedSet(code)}
        />
      )}

      {/* Card Detail Modal */}
      {detailCardId && (
        <CardDetailModal
          cardId={detailCardId}
          collectionEntry={collectionEntryMap.get(detailCardId)}
          isInDisplayCase={displayCaseSet.has(detailCardId)}
          displayCaseFull={
            save.displayCase.length >= displayCaseCapacity &&
            !displayCaseSet.has(detailCardId)
          }
          displayCaseCapacity={displayCaseCapacity}
          displayCaseCount={save.displayCase.length}
          onToggleDisplayCase={() => handleToggleDisplayCase(detailCardId)}
          onClose={() => setDetailCardId(null)}
        />
      )}
    </div>
  );
}

function SetListView({
  sets,
  setStats,
  onSelectSet,
}: {
  sets: SetDefinition[];
  setStats: Map<
    string,
    { base: number; baseTotal: number; showcase: number; showcaseTotal: number }
  >;
  onSelectSet: (code: string) => void;
}) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">Sets</h2>
      <div className="space-y-3">
        {sets.map((set) => {
          const stats = setStats.get(set.setCode) ?? {
            base: 0,
            baseTotal: 0,
            showcase: 0,
            showcaseTotal: 0,
          };
          const pct =
            stats.baseTotal > 0
              ? Math.round((stats.base / stats.baseTotal) * 100)
              : 0;

          return (
            <button
              key={set.setCode}
              onClick={() => onSelectSet(set.setCode)}
              className="border-card-border bg-card-background hover:bg-card-hover w-full rounded-xl border p-4 text-left transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{set.setName}</h3>
                  <p className="text-foreground-secondary text-sm">
                    {stats.base}/{stats.baseTotal} base
                    {stats.showcaseTotal > 0 &&
                      ` + ${stats.showcase}/${stats.showcaseTotal} showcase`}
                  </p>
                </div>
                <span className="text-accent-primary text-lg font-bold">
                  {pct}%
                </span>
              </div>
              {/* Progress bar */}
              <div className="bg-card-border mt-2 h-1.5 w-full overflow-hidden rounded-full">
                <div
                  className="bg-accent-primary h-full rounded-full transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function CardGridView({
  setCode,
  ownedMap,
  newCardIds,
  onBack,
  stats,
  set,
  onCardTap,
}: {
  setCode: string;
  ownedMap: Map<string, number>;
  newCardIds: Set<string>;
  onBack: () => void;
  stats: {
    base: number;
    baseTotal: number;
    showcase: number;
    showcaseTotal: number;
  };
  set: SetDefinition;
  onCardTap: (cardId: string) => void;
}) {
  const [filter, setFilter] = useState<"all" | "owned" | "missing">("all");
  const [showShowcase, setShowShowcase] = useState(false);

  const cards = showShowcase
    ? getShowcaseCardsBySet(setCode)
    : getBaseCardsBySet(setCode);

  const filteredCards = cards.filter((card) => {
    const owned = ownedMap.has(card.id);
    if (filter === "owned") return owned;
    if (filter === "missing") return !owned;
    return true;
  });

  // Sort by collector number
  const sortedCards = [...filteredCards].sort(
    (a, b) => a.collectorNumber - b.collectorNumber,
  );

  return (
    <div>
      {/* Back + Set header */}
      <div className="mb-4">
        <button
          onClick={onBack}
          className="text-foreground-secondary hover:text-foreground mb-2 min-h-[44px] px-1 py-2 text-sm"
        >
          &larr; Back to Sets
        </button>
        <h2 className="text-lg font-semibold">{set.setName}</h2>
        <p className="text-foreground-secondary text-sm">
          {stats.base}/{stats.baseTotal} base cards
        </p>
      </div>

      {/* Filters */}
      <div className="mb-4 flex gap-2">
        {(["all", "owned", "missing"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`min-h-[44px] rounded-lg px-3 py-2.5 text-xs font-medium capitalize transition-colors ${
              filter === f
                ? "bg-accent-primary text-white"
                : "bg-card-background text-foreground-secondary border-card-border border"
            }`}
          >
            {f}
          </button>
        ))}
        <button
          onClick={() => setShowShowcase(!showShowcase)}
          className={`ml-auto min-h-[44px] rounded-lg px-3 py-2.5 text-xs font-medium transition-colors ${
            showShowcase
              ? "bg-rarity-showcase/20 text-rarity-showcase"
              : "bg-card-background text-foreground-secondary border-card-border border"
          }`}
        >
          Showcase
        </button>
      </div>

      {/* Card Grid */}
      <div className="grid grid-cols-4 gap-2">
        {sortedCards.map((card) => {
          const copies = ownedMap.get(card.id) ?? 0;
          const isOwned = copies > 0;
          const isNew = newCardIds.has(card.id);

          return (
            <button
              key={card.id}
              onClick={() => isOwned && onCardTap(card.id)}
              className={`relative rounded-lg border p-2 text-center transition-all ${
                isOwned
                  ? `${getRarityBorderClass(card.rarity)} bg-card-background active:scale-95`
                  : "border-card-border bg-card-background/30 opacity-40"
              }`}
              disabled={!isOwned}
            >
              {isNew && (
                <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-green-500" />
              )}
              <div
                className={`mx-auto mb-1 flex h-12 w-full items-center justify-center rounded text-[10px] ${
                  isOwned ? getRarityBgClass(card.rarity) : "bg-gray-800/50"
                }`}
              >
                #{card.collectorNumber}
              </div>
              <p className="truncate text-[9px] leading-tight font-medium">
                {isOwned ? card.name : "???"}
              </p>
              {isOwned && copies > 1 && (
                <span className="text-foreground-muted text-[8px]">
                  x{copies}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {sortedCards.length === 0 && (
        <p className="text-foreground-muted mt-8 text-center text-sm">
          {filter === "owned"
            ? "No cards owned in this set yet."
            : filter === "missing"
              ? "You have all the cards!"
              : "No cards found."}
        </p>
      )}
    </div>
  );
}

// ── Card Detail Modal ───────────────────────────────

function CardDetailModal({
  cardId,
  collectionEntry,
  isInDisplayCase,
  displayCaseFull,
  displayCaseCapacity,
  displayCaseCount,
  onToggleDisplayCase,
  onClose,
}: {
  cardId: string;
  collectionEntry: CollectionEntry | undefined;
  isInDisplayCase: boolean;
  displayCaseFull: boolean;
  displayCaseCapacity: number;
  displayCaseCount: number;
  onToggleDisplayCase: () => void;
  onClose: () => void;
}) {
  const card = getCardById(cardId);
  const meta = getGameplayMeta(cardId);

  if (!card) return null;

  const copies = collectionEntry?.copiesOwned ?? 0;
  const firstObtained = collectionEntry?.firstObtainedAt
    ? new Date(collectionEntry.firstObtainedAt).toLocaleDateString()
    : null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="bg-background border-card-border max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-2xl border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Card header with rarity accent */}
        <div className={`rounded-t-2xl p-4 ${getRarityHeaderBg(card.rarity)}`}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium tracking-wide uppercase opacity-70">
                {card.setName}
              </p>
              <h2 className="mt-1 text-xl font-bold">{card.name}</h2>
              <p className="mt-0.5 text-xs opacity-70">
                #{card.collectorNumber} / {card.publicCode}
              </p>
            </div>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-black/20 text-sm"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Card details */}
        <div className="space-y-4 p-4">
          {/* Rarity + Type */}
          <div className="flex flex-wrap gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${getRarityBadgeClass(card.rarity)}`}
            >
              {card.rarity}
            </span>
            <span className="border-card-border rounded-full border px-2 py-0.5 text-xs capitalize">
              {card.cardType}
            </span>
            {card.supertype && (
              <span className="border-card-border rounded-full border px-2 py-0.5 text-xs capitalize">
                {card.supertype}
              </span>
            )}
            {card.domains.map((d) => (
              <span
                key={d}
                className="border-card-border rounded-full border px-2 py-0.5 text-xs capitalize"
              >
                {d}
              </span>
            ))}
          </div>

          {/* Card text */}
          {card.textPlain && (
            <div className="bg-card-background border-card-border rounded-lg border p-3">
              <p className="text-foreground-secondary text-xs leading-relaxed">
                {card.textPlain}
              </p>
            </div>
          )}

          {/* Attributes */}
          {(card.attributes.energy !== null ||
            card.attributes.might !== null ||
            card.attributes.power !== null) && (
            <div className="flex gap-3">
              {card.attributes.energy !== null && (
                <AttrBadge label="Energy" value={card.attributes.energy} />
              )}
              {card.attributes.might !== null && (
                <AttrBadge label="Might" value={card.attributes.might} />
              )}
              {card.attributes.power !== null && (
                <AttrBadge label="Power" value={card.attributes.power} />
              )}
            </div>
          )}

          {/* Collection info */}
          <div className="border-card-border border-t pt-4">
            <h3 className="text-foreground-secondary mb-2 text-xs font-semibold tracking-wide uppercase">
              Your Collection
            </h3>
            <div className="grid grid-cols-2 gap-y-2 text-sm">
              <span className="text-foreground-secondary">Copies Owned</span>
              <span className="text-right font-medium">{copies}</span>
              {firstObtained && (
                <>
                  <span className="text-foreground-secondary">
                    First Obtained
                  </span>
                  <span className="text-right font-medium">
                    {firstObtained}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Gameplay Meta */}
          {meta && (
            <div className="border-card-border border-t pt-4">
              <h3 className="text-foreground-secondary mb-2 text-xs font-semibold tracking-wide uppercase">
                Card Stats
              </h3>
              <div className="grid grid-cols-2 gap-y-2 text-sm">
                <span className="text-foreground-secondary">Base Value</span>
                <span className="text-currency-gold text-right font-medium">
                  {meta.baseValue} G
                </span>
                <span className="text-foreground-secondary">
                  Collector Score
                </span>
                <span className="text-right font-medium">
                  {meta.collectorScore}
                </span>
                <span className="text-foreground-secondary">Display Score</span>
                <span className="text-right font-medium">
                  {meta.displayScore}
                </span>
                <span className="text-foreground-secondary">
                  Playable Score
                </span>
                <span className="text-right font-medium">
                  {meta.playableScore}
                </span>
              </div>
            </div>
          )}

          {/* Showcase variant info */}
          {card.rarity === "showcase" && card.showcaseVariant && (
            <div className="border-card-border border-t pt-4">
              <h3 className="text-foreground-secondary mb-2 text-xs font-semibold tracking-wide uppercase">
                Variant
              </h3>
              <p className="text-rarity-showcase text-sm font-medium capitalize">
                {card.showcaseVariant.replace("_", " ")}
              </p>
            </div>
          )}

          {/* Display Case toggle */}
          {copies > 0 && (
            <div className="border-card-border border-t pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Display Case</p>
                  <p className="text-foreground-muted text-xs">
                    {displayCaseCount}/{displayCaseCapacity} slots used
                  </p>
                </div>
                <button
                  onClick={onToggleDisplayCase}
                  disabled={!isInDisplayCase && displayCaseFull}
                  className={`min-h-[44px] rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    isInDisplayCase
                      ? "bg-rarity-showcase/20 text-rarity-showcase"
                      : displayCaseFull
                        ? "bg-card-hover text-foreground-muted cursor-not-allowed"
                        : "bg-accent-primary hover:bg-accent-primary-hover text-white"
                  }`}
                >
                  {isInDisplayCase
                    ? "Remove"
                    : displayCaseFull
                      ? "Full"
                      : "Showcase"}
                </button>
              </div>
            </div>
          )}

          {/* Artist */}
          {card.artist && (
            <p className="text-foreground-muted pt-2 text-center text-[10px]">
              Art by {card.artist}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function AttrBadge({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-card-border bg-card-background rounded-lg border px-3 py-1.5 text-center">
      <p className="text-foreground-muted text-[10px]">{label}</p>
      <p className="text-sm font-bold">{value}</p>
    </div>
  );
}

// ── Rarity helpers ──────────────────────────────────

function getRarityBorderClass(rarity: Rarity): string {
  switch (rarity) {
    case "common":
      return "border-rarity-common/30";
    case "uncommon":
      return "border-rarity-uncommon/40";
    case "rare":
      return "border-rarity-rare/50";
    case "epic":
      return "border-rarity-epic/60";
    case "showcase":
      return "border-rarity-showcase/70";
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

function getRarityHeaderBg(rarity: Rarity): string {
  switch (rarity) {
    case "common":
      return "bg-rarity-common/10";
    case "uncommon":
      return "bg-rarity-uncommon/15";
    case "rare":
      return "bg-rarity-rare/15";
    case "epic":
      return "bg-rarity-epic/15";
    case "showcase":
      return "bg-rarity-showcase/15";
    default:
      return "bg-card-background";
  }
}

function getRarityBadgeClass(rarity: Rarity): string {
  switch (rarity) {
    case "common":
      return "bg-rarity-common/20 text-rarity-common";
    case "uncommon":
      return "bg-rarity-uncommon/20 text-rarity-uncommon";
    case "rare":
      return "bg-rarity-rare/20 text-rarity-rare";
    case "epic":
      return "bg-rarity-epic/20 text-rarity-epic";
    case "showcase":
      return "bg-rarity-showcase/20 text-rarity-showcase";
    default:
      return "bg-card-background text-foreground";
  }
}

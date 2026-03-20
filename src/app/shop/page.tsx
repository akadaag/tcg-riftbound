"use client";

import { useGameStore } from "@/stores/game-store";
import { getProductById } from "@/features/catalog";
import {
  getActiveEvents,
  getCombinedEventModifiers,
} from "@/features/engine/events";
import { getHypeMultiplier } from "@/features/engine/hype";
import { calculateSellPrice } from "@/features/engine/economy";
import { MAX_SINGLES_SLOTS, SINGLES_UNLOCK_LEVEL } from "@/features/singles";
import Link from "next/link";
import { useState } from "react";

export default function ShopPage() {
  const {
    save,
    setShelfProduct,
    setShelfMarkup,
    restockShelf,
    removeShelfStock,
  } = useGameStore();
  const [selectedShelf, setSelectedShelf] = useState<number | null>(null);

  const activeEvents = getActiveEvents(save.activeEvents, save.currentDay);
  const eventMods = getCombinedEventModifiers(activeEvents);
  const hypeBySet = new Map(
    save.setHype.map((h) => [h.setCode, h.currentHype]),
  );

  const totalInventory = save.inventory.reduce(
    (acc, item) => acc + item.ownedQuantity,
    0,
  );

  return (
    <div className="flex flex-1 flex-col px-4 pt-6 pb-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Shop</h1>
        <p className="text-foreground-secondary mt-1 text-sm">
          Day {save.currentDay} — Manage your shelves and sales.
        </p>
        <div className="mt-2 flex items-center gap-3">
          <span className="text-currency-gold text-sm font-bold">
            {save.softCurrency.toLocaleString()} G
          </span>
          <span className="text-foreground-muted text-xs">
            Rep: {save.reputation}
          </span>
        </div>
      </div>

      {/* Active Events Banner */}
      {activeEvents.length > 0 && (
        <div className="mb-4 space-y-2">
          {activeEvents.map((event) => (
            <div
              key={event.id}
              className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2"
            >
              <p className="text-sm font-medium text-yellow-300">
                {event.name}
              </p>
              <p className="text-xs text-yellow-400/70">{event.description}</p>
            </div>
          ))}
        </div>
      )}

      {/* Today's Stats */}
      <div className="mb-6 grid grid-cols-3 gap-2">
        <MiniStat
          label="Revenue"
          value={`${save.todayReport.revenue.toLocaleString()} G`}
        />
        <MiniStat
          label="Customers"
          value={`${save.todayReport.customersPurchased}/${save.todayReport.customersVisited}`}
        />
        <MiniStat
          label="Packs Opened"
          value={save.todayReport.packsOpened.toString()}
        />
      </div>

      {/* Shelves */}
      <section className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Shelves</h2>
          <span className="text-foreground-muted text-xs">
            {save.shelves.filter((s) => s.productId).length}/
            {save.shelves.length} active
          </span>
        </div>
        <div className="space-y-3">
          {save.shelves.map((shelf, index) => (
            <ShelfCard
              key={index}
              shelf={shelf}
              index={index}
              isSelected={selectedShelf === index}
              hypeBySet={hypeBySet}
              onSelect={() =>
                setSelectedShelf(selectedShelf === index ? null : index)
              }
              onMarkupChange={(markup) => setShelfMarkup(index, markup)}
              onRestock={(qty) => restockShelf(index, qty)}
              onRemove={(qty) => removeShelfStock(index, qty)}
              inventory={save.inventory}
              onSetProduct={(productId, qty) =>
                setShelfProduct(index, productId, qty)
              }
            />
          ))}
        </div>
      </section>

      {/* Inventory / Supplier Link */}
      <section className="mb-6 space-y-3">
        <Link
          href="/shop/supplier"
          className="border-accent-primary/30 bg-accent-primary/10 hover:bg-accent-primary/20 flex items-center justify-between rounded-xl border p-4 transition-colors"
        >
          <div>
            <p className="text-accent-primary font-medium">Buy from Supplier</p>
            <p className="text-foreground-secondary text-sm">
              {totalInventory} items in storage
            </p>
          </div>
          <span className="text-accent-primary">&rarr;</span>
        </Link>

        {/* Singles Counter Link */}
        {save.shopLevel >= SINGLES_UNLOCK_LEVEL ? (
          <Link
            href="/shop/singles"
            className="border-accent-secondary/30 bg-accent-secondary/10 hover:bg-accent-secondary/20 flex items-center justify-between rounded-xl border p-4 transition-colors"
          >
            <div>
              <p className="text-accent-secondary font-medium">
                Singles Counter
              </p>
              <p className="text-foreground-secondary text-sm">
                {save.singlesListings.length}/{MAX_SINGLES_SLOTS} slots used
              </p>
            </div>
            <span className="text-accent-secondary">&rarr;</span>
          </Link>
        ) : (
          <div className="border-card-border bg-card-background flex items-center justify-between rounded-xl border p-4 opacity-50">
            <div>
              <p className="text-foreground-muted font-medium">
                Singles Counter 🔒
              </p>
              <p className="text-foreground-muted text-sm">
                Unlocks at shop level {SINGLES_UNLOCK_LEVEL}
              </p>
            </div>
          </div>
        )}

        {/* Shop Areas Link */}
        <Link
          href="/shop/areas"
          className="border-card-border bg-card-background hover:bg-card-hover flex items-center justify-between rounded-xl border p-4 transition-colors"
        >
          <div>
            <p className="font-medium">Shop Areas</p>
            <p className="text-foreground-secondary text-sm">
              Expand and upgrade your shop
            </p>
          </div>
          <span className="text-foreground-muted">&rarr;</span>
        </Link>
      </section>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-card-border bg-card-background rounded-lg border p-2 text-center">
      <p className="text-foreground-muted text-[10px]">{label}</p>
      <p className="text-sm font-bold">{value}</p>
    </div>
  );
}

function ShelfCard({
  shelf,
  index,
  isSelected,
  hypeBySet,
  onSelect,
  onMarkupChange,
  onRestock,
  onRemove,
  inventory,
  onSetProduct,
}: {
  shelf: { productId: string | null; quantity: number; markup: number };
  index: number;
  isSelected: boolean;
  hypeBySet: Map<string, number>;
  onSelect: () => void;
  onMarkupChange: (markup: number) => void;
  onRestock: (qty: number) => void;
  onRemove: (qty: number) => void;
  inventory: { productId: string; ownedQuantity: number }[];
  onSetProduct: (productId: string | null, qty: number) => void;
}) {
  const product = shelf.productId ? getProductById(shelf.productId) : null;

  const setHypeValue = product ? (hypeBySet.get(product.setCode) ?? 50) : 50;
  const hypeMult = getHypeMultiplier(setHypeValue);
  const sellPrice = product
    ? calculateSellPrice(product.sellPriceBase, shelf.markup, hypeMult)
    : 0;

  // Available in storage for this product
  const inStorage = shelf.productId
    ? (inventory.find((i) => i.productId === shelf.productId)?.ownedQuantity ??
      0)
    : 0;

  return (
    <div
      className={`border-card-border bg-card-background rounded-xl border transition-all ${
        isSelected ? "ring-accent-primary/50 ring-2" : ""
      }`}
    >
      <button
        onClick={onSelect}
        className="flex w-full items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold ${
              shelf.productId
                ? "bg-accent-primary/20 text-accent-primary"
                : "bg-card-border text-foreground-muted"
            }`}
          >
            {index + 1}
          </div>
          <div>
            {product ? (
              <>
                <p className="font-medium">{product.name}</p>
                <p className="text-foreground-secondary text-sm">
                  {shelf.quantity} in stock &middot;{" "}
                  {sellPrice.toLocaleString()} G each
                </p>
              </>
            ) : (
              <>
                <p className="text-foreground-muted font-medium">Empty Shelf</p>
                <p className="text-foreground-muted text-sm">
                  Tap to stock a product
                </p>
              </>
            )}
          </div>
        </div>
        {product && (
          <div className="text-right">
            <p className="text-sm font-medium">+{shelf.markup}%</p>
            <p className="text-foreground-muted text-xs">markup</p>
          </div>
        )}
      </button>

      {/* Expanded controls */}
      {isSelected && (
        <div className="border-card-border border-t px-4 pt-3 pb-4">
          {product ? (
            <>
              {/* Markup slider */}
              <div className="mb-3">
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-foreground-secondary">Markup</span>
                  <span className="font-medium">{shelf.markup}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={shelf.markup}
                  onChange={(e) => onMarkupChange(Number(e.target.value))}
                  className="accent-accent-primary w-full"
                  aria-label={`Markup percentage: ${shelf.markup}%`}
                />
                <div className="text-foreground-muted mt-0.5 flex justify-between text-xs">
                  <span>0% (fast sales)</span>
                  <span>100% (max profit)</span>
                </div>
              </div>

              {/* Restock / Remove */}
              <div className="flex gap-2">
                <button
                  onClick={() => onRestock(1)}
                  disabled={inStorage === 0}
                  className="bg-accent-primary/20 text-accent-primary hover:bg-accent-primary/30 min-h-[44px] flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:opacity-40"
                >
                  Restock ({inStorage} avail)
                </button>
                <button
                  onClick={() => onRemove(shelf.quantity)}
                  className="min-h-[44px] rounded-lg bg-red-500/20 px-3 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/30"
                >
                  Clear
                </button>
              </div>
            </>
          ) : (
            /* Product picker for empty shelf */
            <div className="space-y-2">
              <p className="text-foreground-secondary mb-2 text-sm">
                Choose a product from storage:
              </p>
              {inventory.filter((i) => i.ownedQuantity > 0).length === 0 ? (
                <p className="text-foreground-muted text-sm">
                  No products in storage. Buy from the supplier first.
                </p>
              ) : (
                inventory
                  .filter((i) => i.ownedQuantity > 0)
                  .map((item) => {
                    const p = getProductById(item.productId);
                    if (!p) return null;
                    return (
                      <button
                        key={item.productId}
                        onClick={() => {
                          onSetProduct(item.productId, 1);
                        }}
                        className="border-card-border hover:bg-card-hover flex w-full items-center justify-between rounded-lg border p-3 transition-colors"
                      >
                        <span className="text-sm font-medium">{p.name}</span>
                        <span className="text-foreground-secondary text-sm">
                          {item.ownedQuantity} avail
                        </span>
                      </button>
                    );
                  })
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

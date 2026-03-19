"use client";

import { useGameStore } from "@/stores/game-store";
import {
  getAllProducts,
  getAllSets,
  getProductsBySet,
} from "@/features/catalog";
import type { ProductDefinition, SetDefinition } from "@/types/game";
import { useState } from "react";
import Link from "next/link";
import {
  getCombinedEventModifiers,
  getActiveEvents,
} from "@/features/engine/events";
import { getUpgradeModifiers } from "@/features/upgrades";

export default function SupplierPage() {
  const { save, buyFromSupplier } = useGameStore();
  const sets = getAllSets();

  const activeEvents = getActiveEvents(save.activeEvents, save.currentDay);
  const eventMods = getCombinedEventModifiers(activeEvents);
  const upgradeMods = getUpgradeModifiers(save.upgrades);

  // Combined wholesale multiplier: event modifier * (1 - upgrade discount)
  const combinedWholesaleMultiplier =
    eventMods.wholesaleMultiplier * (1 - upgradeMods.wholesaleDiscount);

  return (
    <div className="flex flex-1 flex-col px-4 pt-6 pb-4">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <Link
          href="/shop"
          className="text-foreground-secondary hover:text-foreground flex min-h-[44px] items-center gap-1 px-1 py-2 text-sm"
        >
          <span>&larr;</span> Shop
        </Link>
      </div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Supplier</h1>
        <p className="text-foreground-secondary mt-1 text-sm">
          Buy stock from the distributor to sell in your shop.
        </p>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-currency-gold text-sm font-bold">
            {save.softCurrency.toLocaleString()} G
          </span>
          {combinedWholesaleMultiplier < 1 && (
            <span className="rounded bg-green-500/20 px-2 py-0.5 text-xs text-green-400">
              {Math.round((1 - combinedWholesaleMultiplier) * 100)}% off
            </span>
          )}
          {combinedWholesaleMultiplier > 1 && (
            <span className="rounded bg-red-500/20 px-2 py-0.5 text-xs text-red-400">
              +{Math.round((combinedWholesaleMultiplier - 1) * 100)}% prices
            </span>
          )}
        </div>
      </div>

      {/* Products by set */}
      {sets.map((set) => (
        <SetSection
          key={set.setCode}
          set={set}
          shopLevel={save.shopLevel}
          currency={save.softCurrency}
          unlockedProducts={save.unlockedProducts}
          wholesaleMultiplier={combinedWholesaleMultiplier}
          onBuy={buyFromSupplier}
        />
      ))}
    </div>
  );
}

function SetSection({
  set,
  shopLevel,
  currency,
  unlockedProducts,
  wholesaleMultiplier,
  onBuy,
}: {
  set: SetDefinition;
  shopLevel: number;
  currency: number;
  unlockedProducts: string[];
  wholesaleMultiplier: number;
  onBuy: (
    productId: string,
    quantity: number,
    totalCost: number,
    packsProductId?: string,
  ) => void;
}) {
  const products = getProductsBySet(set.setCode);
  if (products.length === 0) return null;

  return (
    <section className="mb-6">
      <h2 className="mb-3 text-lg font-semibold">{set.setName}</h2>
      <div className="space-y-3">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            shopLevel={shopLevel}
            currency={currency}
            unlockedProducts={unlockedProducts}
            wholesaleMultiplier={wholesaleMultiplier}
            allProducts={products}
            onBuy={onBuy}
          />
        ))}
      </div>
    </section>
  );
}

function ProductCard({
  product,
  shopLevel,
  currency,
  unlockedProducts,
  wholesaleMultiplier,
  allProducts,
  onBuy,
}: {
  product: ProductDefinition;
  shopLevel: number;
  currency: number;
  unlockedProducts: string[];
  wholesaleMultiplier: number;
  allProducts: ProductDefinition[];
  onBuy: (
    productId: string,
    quantity: number,
    totalCost: number,
    packsProductId?: string,
  ) => void;
}) {
  const [quantity, setQuantity] = useState(1);

  // Check if product is locked
  const isLocked = isProductLocked(product, shopLevel, unlockedProducts);
  const effectivePrice = Math.round(product.buyPrice * wholesaleMultiplier);
  const totalCost = effectivePrice * quantity;
  const canAfford = currency >= totalCost;

  // For boxes, find the corresponding pack product for conversion
  const packProduct =
    product.productType === "booster_box"
      ? allProducts.find(
          (p) =>
            p.setCode === product.setCode && p.productType === "booster_pack",
        )
      : null;

  const handleBuy = () => {
    if (isLocked || !canAfford) return;
    onBuy(product.id, quantity, totalCost, packProduct?.id);
    setQuantity(1);
  };

  return (
    <div
      className={`border-card-border bg-card-background rounded-xl border p-4 ${
        isLocked ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-medium">{product.name}</h3>
            {product.productType === "booster_box" && (
              <span className="rounded bg-purple-500/20 px-1.5 py-0.5 text-xs text-purple-400">
                Box
              </span>
            )}
            {product.productType === "starter" && (
              <span className="rounded bg-blue-500/20 px-1.5 py-0.5 text-xs text-blue-400">
                Starter
              </span>
            )}
          </div>
          <p className="text-foreground-secondary mt-0.5 text-sm">
            {product.cardsPerUnit} cards
            {product.packsPerUnit ? ` (${product.packsPerUnit} packs)` : ""}
          </p>
          {isLocked && (
            <p className="mt-1 text-xs text-red-400">
              {getUnlockDescription(product.unlockRequirement)}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-currency-gold font-bold">
            {effectivePrice.toLocaleString()} G
          </p>
          {wholesaleMultiplier !== 1 && (
            <p className="text-foreground-muted text-xs line-through">
              {product.buyPrice.toLocaleString()} G
            </p>
          )}
        </div>
      </div>

      {!isLocked && (
        <div className="mt-3 flex items-center gap-3">
          {/* Quantity control */}
          <div className="border-card-border flex items-center rounded-lg border">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="text-foreground-secondary hover:text-foreground min-h-[44px] px-3 py-2 text-sm"
            >
              -
            </button>
            <span className="min-w-[2rem] text-center text-sm font-medium">
              {quantity}
            </span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              className="text-foreground-secondary hover:text-foreground min-h-[44px] px-3 py-2 text-sm"
            >
              +
            </button>
          </div>

          {/* Buy button */}
          <button
            onClick={handleBuy}
            disabled={!canAfford}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              canAfford
                ? "bg-accent-primary hover:bg-accent-primary-hover text-white"
                : "bg-card-border cursor-not-allowed text-gray-500"
            }`}
          >
            Buy {quantity > 1 ? `(${totalCost.toLocaleString()} G)` : ""}
          </button>
        </div>
      )}
    </div>
  );
}

function isProductLocked(
  product: ProductDefinition,
  shopLevel: number,
  unlockedProducts: string[],
): boolean {
  if (!product.unlockRequirement) return false;
  if (unlockedProducts.includes(product.id)) return false;

  // Parse unlock requirement
  if (product.unlockRequirement.startsWith("shop_level_")) {
    const requiredLevel = parseInt(
      product.unlockRequirement.replace("shop_level_", ""),
    );
    return shopLevel < requiredLevel;
  }

  return true;
}

function getUnlockDescription(requirement: string | null): string {
  if (!requirement) return "";
  if (requirement.startsWith("shop_level_")) {
    const level = requirement.replace("shop_level_", "");
    return `Requires Shop Level ${level}`;
  }
  return `Requires: ${requirement}`;
}

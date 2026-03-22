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
import {
  getUpgradeModifiers,
  getTotalInventoryCapacity,
} from "@/features/upgrades";
import { getStaffEffects } from "@/features/engine/staff";
import {
  LIMITED_PRODUCTS_UNLOCK_LEVEL,
  restoreRotationFromSave,
  generateLimitedRotation,
  getWeekNumber,
  type LimitedProduct,
} from "@/features/engine/limited-products";

export default function SupplierPage() {
  const { save, buyFromSupplier, buyLimitedProduct } = useGameStore();
  const sets = getAllSets();

  const activeEvents = getActiveEvents(save.activeEvents, save.currentDay);
  const eventMods = getCombinedEventModifiers(activeEvents);
  const upgradeMods = getUpgradeModifiers(save.upgrades);
  const staffEffects = getStaffEffects(save.staff ?? []);

  // Inventory capacity
  const totalCapacity = getTotalInventoryCapacity(save.upgrades);
  const currentStock = save.inventory.reduce(
    (sum, item) => sum + item.ownedQuantity,
    0,
  );
  const capacityPct = Math.min(
    100,
    Math.round((currentStock / totalCapacity) * 100),
  );

  // Combined wholesale multiplier: event modifier * (1 - upgrade discount - staff discount)
  // P4-09: Clamp to prevent negative multiplier when discounts exceed 100%
  const combinedWholesaleMultiplier = Math.max(
    0.01,
    eventMods.wholesaleMultiplier *
      (1 - upgradeMods.wholesaleDiscount - staffEffects.wholesaleDiscount),
  );

  // C2: Limited products
  const showLimited = save.shopLevel >= LIMITED_PRODUCTS_UNLOCK_LEVEL;
  let limitedProducts: LimitedProduct[] = [];
  if (showLimited && save.limitedProductRotation) {
    const rotation = restoreRotationFromSave(
      save.limitedProductRotation,
      save.shopLevel,
    );
    limitedProducts = rotation.products;
  } else if (showLimited) {
    // Generate on-the-fly if not yet saved (first visit)
    const weekNum = getWeekNumber(save.currentDay);
    const rotation = generateLimitedRotation(weekNum, save.shopLevel);
    limitedProducts = rotation.products;
  }

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
        {/* Inventory capacity bar */}
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-foreground-secondary">Inventory</span>
            <span
              className={`font-medium ${capacityPct >= 90 ? "text-red-400" : capacityPct >= 70 ? "text-yellow-400" : "text-foreground-muted"}`}
            >
              {currentStock}/{totalCapacity}
            </span>
          </div>
          <div className="bg-card-border h-1.5 w-full overflow-hidden rounded-full">
            <div
              className={`h-full rounded-full transition-all ${capacityPct >= 90 ? "bg-red-500" : capacityPct >= 70 ? "bg-yellow-500" : "bg-accent-primary"}`}
              style={{ width: `${capacityPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* C2: Limited Products Section */}
      {showLimited && limitedProducts.length > 0 && (
        <LimitedSection
          products={limitedProducts}
          currency={save.softCurrency}
          remainingCapacity={totalCapacity - currentStock}
          onBuy={buyLimitedProduct}
        />
      )}

      {/* Products by set */}
      {sets.map((set) => (
        <SetSection
          key={set.setCode}
          set={set}
          shopLevel={save.shopLevel}
          currency={save.softCurrency}
          unlockedProducts={save.unlockedProducts}
          wholesaleMultiplier={combinedWholesaleMultiplier}
          remainingCapacity={totalCapacity - currentStock}
          onBuy={buyFromSupplier}
        />
      ))}
    </div>
  );
}

// ── C2: Limited Products Section ──────────────────────────────────────

function LimitedSection({
  products,
  currency,
  remainingCapacity,
  onBuy,
}: {
  products: LimitedProduct[];
  currency: number;
  remainingCapacity: number;
  onBuy: (
    limitedProductId: string,
    quantity: number,
    totalCost: number,
    packsProductId?: string,
  ) => { success: boolean; reason: string | null };
}) {
  return (
    <section className="mb-6">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-lg font-semibold">Limited Edition</h2>
        <span className="rounded bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-400">
          This Week Only
        </span>
      </div>
      <p className="text-foreground-secondary mb-3 text-xs">
        Exclusive products with higher margins. Limited stock — refreshes
        weekly.
      </p>
      <div className="space-y-3">
        {products.map((product) => (
          <LimitedProductCard
            key={product.id}
            product={product}
            currency={currency}
            remainingCapacity={remainingCapacity}
            onBuy={onBuy}
          />
        ))}
      </div>
    </section>
  );
}

function LimitedProductCard({
  product,
  currency,
  remainingCapacity,
  onBuy,
}: {
  product: LimitedProduct;
  currency: number;
  remainingCapacity: number;
  onBuy: (
    limitedProductId: string,
    quantity: number,
    totalCost: number,
    packsProductId?: string,
  ) => { success: boolean; reason: string | null };
}) {
  const [quantity, setQuantity] = useState(1);

  const totalCost = product.buyPrice * quantity;
  const canAfford = currency >= totalCost;
  const soldOut = product.remainingStock <= 0;
  const maxQty = Math.min(product.remainingStock, remainingCapacity);
  const atCapacity = remainingCapacity <= 0;

  // For boxes, find the corresponding pack product ID
  const isBox = product.baseProductId.includes("box");
  const packsProductId = isBox
    ? product.baseProductId.replace("-box", "-booster")
    : undefined;

  const handleBuy = () => {
    if (soldOut || !canAfford || atCapacity) return;
    const result = onBuy(product.id, quantity, totalCost, packsProductId);
    if (result.success) setQuantity(1);
  };

  return (
    <div
      className={`rounded-xl border p-4 ${
        soldOut
          ? "border-card-border bg-card-background opacity-50"
          : "border-amber-500/30 bg-amber-500/5"
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-medium">{product.name}</h3>
            {isBox && (
              <span className="rounded bg-purple-500/20 px-1.5 py-0.5 text-xs text-purple-400">
                Box
              </span>
            )}
          </div>
          <p className="text-foreground-secondary mt-0.5 text-sm">
            {product.cardsPerUnit} cards
          </p>
          <p className="mt-1 text-xs text-amber-400/70 italic">
            {product.flavourText}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <span
              className={`text-xs font-medium ${soldOut ? "text-red-400" : "text-amber-300"}`}
            >
              {soldOut
                ? "Sold Out"
                : `${product.remainingStock}/${product.totalStock} left`}
            </span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-currency-gold font-bold">
            {product.buyPrice.toLocaleString()} G
          </p>
          <p className="mt-0.5 text-xs text-green-400">
            Sells for ~{product.sellPriceBase.toLocaleString()} G
          </p>
        </div>
      </div>

      {!soldOut && (
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
              onClick={() => setQuantity(Math.min(maxQty, quantity + 1))}
              className="text-foreground-secondary hover:text-foreground min-h-[44px] px-3 py-2 text-sm"
            >
              +
            </button>
          </div>

          {/* Buy button */}
          <button
            onClick={handleBuy}
            disabled={!canAfford || atCapacity}
            className={`min-h-[44px] flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              canAfford && !atCapacity
                ? "bg-amber-600 text-white hover:bg-amber-500"
                : "bg-card-border cursor-not-allowed text-gray-500"
            }`}
          >
            {atCapacity
              ? "Inventory Full"
              : quantity > 1
                ? `Buy (${totalCost.toLocaleString()} G)`
                : "Buy"}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Regular Products ──────────────────────────────────────────────────

function SetSection({
  set,
  shopLevel,
  currency,
  unlockedProducts,
  wholesaleMultiplier,
  remainingCapacity,
  onBuy,
}: {
  set: SetDefinition;
  shopLevel: number;
  currency: number;
  unlockedProducts: string[];
  wholesaleMultiplier: number;
  remainingCapacity: number;
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
            remainingCapacity={remainingCapacity}
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
  remainingCapacity,
  onBuy,
}: {
  product: ProductDefinition;
  shopLevel: number;
  currency: number;
  unlockedProducts: string[];
  wholesaleMultiplier: number;
  allProducts: ProductDefinition[];
  remainingCapacity: number;
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
  // P4-08/P4-18: Cap quantity to remaining inventory capacity
  const maxQty = Math.max(1, remainingCapacity);
  const atCapacity = remainingCapacity <= 0;

  // For boxes, find the corresponding pack product for conversion
  const packProduct =
    product.productType === "booster_box"
      ? allProducts.find(
          (p) =>
            p.setCode === product.setCode && p.productType === "booster_pack",
        )
      : null;

  const handleBuy = () => {
    if (isLocked || !canAfford || atCapacity) return;
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
              onClick={() => setQuantity(Math.min(maxQty, quantity + 1))}
              className="text-foreground-secondary hover:text-foreground min-h-[44px] px-3 py-2 text-sm"
            >
              +
            </button>
          </div>

          {/* Buy button */}
          <button
            onClick={handleBuy}
            disabled={!canAfford || atCapacity}
            className={`min-h-[44px] flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              canAfford && !atCapacity
                ? "bg-accent-primary hover:bg-accent-primary-hover text-white"
                : "bg-card-border cursor-not-allowed text-gray-500"
            }`}
          >
            {atCapacity
              ? "Inventory Full"
              : quantity > 1
                ? `Buy (${totalCost.toLocaleString()} G)`
                : "Buy"}
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

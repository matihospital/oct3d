import type { CostBreakdown, PricingParams, PricingTier } from "./types";

function getTier(totalCost: number, tiers: PricingTier[]): PricingTier {
  return tiers.find((t) => totalCost <= t.maxCost) ?? tiers[tiers.length - 1];
}

/** Redondeo a valores cotizables según magnitud del precio */
export function roundSalePrice(price: number): number {
  if (price <= 0) return 0;
  if (price < 3000) return Math.ceil(price / 100) * 100;
  if (price < 15000) return Math.ceil(price / 500) * 500;
  return Math.ceil(price / 1000) * 1000;
}

function channelPrice(
  totalCost: number,
  multiplier: number,
  floor: number,
): number {
  return roundSalePrice(Math.max(totalCost * multiplier, floor));
}

export function calculateCosts(
  weightGrams: number,
  printTimeSeconds: number,
  pricing: PricingParams,
): CostBreakdown {
  const printTimeHours = printTimeSeconds / 3600;
  const filamentCost = (weightGrams / 1000) * pricing.plaPricePerKg;
  const electricCost =
    printTimeHours * (pricing.printerWatts / 1000) * pricing.kwhPrice;
  const totalCost = filamentCost + electricCost;

  const tier = getTier(totalCost, pricing.tiers);

  let retailPrice = channelPrice(
    totalCost,
    tier.retailMultiplier,
    pricing.minRetailPrice,
  );
  let wholesalePrice = channelPrice(
    totalCost,
    tier.wholesaleMultiplier,
    pricing.minWholesalePrice,
  );
  let bulkPrice = channelPrice(
    totalCost,
    tier.bulkMultiplier,
    pricing.minBulkPrice,
  );

  // Mayorista siempre ≤ público; volumen ≤ mayorista
  wholesalePrice = Math.min(wholesalePrice, retailPrice);
  bulkPrice = Math.min(bulkPrice, wholesalePrice);

  return {
    filamentCost,
    electricCost,
    totalCost,
    retailPrice,
    wholesalePrice,
    bulkPrice,
    weightGrams,
    printTimeSeconds,
    printTimeHours,
  };
}

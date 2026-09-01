import type { PricingParams } from "./types";

export const DEFAULT_PRICING: PricingParams = {
  kwhPrice: 337.61,
  printerWatts: 220,
  plaPricePerKg: 18000,
  minRetailPrice: 1500,
  minWholesalePrice: 800,
  minBulkPrice: 600,
  bulkQuantity: 50,
  bulkMaxRetailPrice: 5000,
  tiers: [
    { maxCost: 800, retailMultiplier: 4, wholesaleMultiplier: 2.5, bulkMultiplier: 2 },
    { maxCost: 2500, retailMultiplier: 3.5, wholesaleMultiplier: 2.2, bulkMultiplier: 1.75 },
    { maxCost: 6000, retailMultiplier: 2.8, wholesaleMultiplier: 1.9, bulkMultiplier: 1.5 },
    { maxCost: Infinity, retailMultiplier: 2.2, wholesaleMultiplier: 1.6, bulkMultiplier: 1.25 },
  ],
};

export const BAMBU_API = "https://api.bambulab.com/v1/design-service/design";

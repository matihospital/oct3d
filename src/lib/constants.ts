import type { PricingParams } from "./types";

export const DEFAULT_PRICING: PricingParams = {
  kwhPrice: 337.61,
  printerWatts: 220,
  plaPricePerKg: 18000,
  retailMultiplier: 3,
  wholesaleMultiplier: 2,
};

export const BAMBU_API = "https://api.bambulab.com/v1/design-service/design";

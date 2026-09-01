import type { CostBreakdown, PricingParams } from "./types";

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
  const retailPrice = totalCost * pricing.retailMultiplier;
  const wholesalePrice = totalCost * pricing.wholesaleMultiplier;

  return {
    filamentCost,
    electricCost,
    totalCost,
    retailPrice,
    wholesalePrice,
    weightGrams,
    printTimeSeconds,
    printTimeHours,
  };
}

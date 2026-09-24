import type { PricingParams, PricingTier } from "./types";

/** Tramo serializable en JSON (maxCost null = Infinity) */
export type StoredPricingTier = {
  maxCost: number | null;
  retailMultiplier: number;
  wholesaleMultiplier: number;
  bulkMultiplier: number;
};

export function serializeTiers(tiers: PricingTier[]): StoredPricingTier[] {
  return tiers.map((t) => ({
    maxCost: Number.isFinite(t.maxCost) ? t.maxCost : null,
    retailMultiplier: t.retailMultiplier,
    wholesaleMultiplier: t.wholesaleMultiplier,
    bulkMultiplier: t.bulkMultiplier,
  }));
}

export function deserializeTiers(tiers: StoredPricingTier[]): PricingTier[] {
  return tiers.map((t) => ({
    maxCost: t.maxCost == null ? Infinity : t.maxCost,
    retailMultiplier: t.retailMultiplier,
    wholesaleMultiplier: t.wholesaleMultiplier,
    bulkMultiplier: t.bulkMultiplier,
  }));
}

export type PricingSettingsRecord = {
  kwhPrice: number;
  printerWatts: number;
  plaPricePerKg: number;
  minRetailPrice: number;
  minWholesalePrice: number;
  minBulkPrice: number;
  bulkQuantity: number;
  bulkMaxRetailPrice: number;
  longPrintHours: number;
  tiers: StoredPricingTier[];
};

export function toPricingParams(record: PricingSettingsRecord): PricingParams {
  return {
    kwhPrice: record.kwhPrice,
    printerWatts: record.printerWatts,
    plaPricePerKg: record.plaPricePerKg,
    minRetailPrice: record.minRetailPrice,
    minWholesalePrice: record.minWholesalePrice,
    minBulkPrice: record.minBulkPrice,
    bulkQuantity: record.bulkQuantity,
    bulkMaxRetailPrice: record.bulkMaxRetailPrice,
    tiers: deserializeTiers(record.tiers),
  };
}

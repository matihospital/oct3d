import { prisma } from "@oct3d/db";
import {
  DEFAULT_PRICING,
  LONG_PRINT_HOURS,
  serializeTiers,
  toPricingParams,
  type PricingParams,
  type PricingSettingsRecord,
  type StoredPricingTier,
} from "@oct3d/pricing";

export type LoadedPricing = PricingParams & { longPrintHours: number };

function defaultRecord(): PricingSettingsRecord {
  return {
    ...DEFAULT_PRICING,
    longPrintHours: LONG_PRINT_HOURS,
    tiers: serializeTiers(DEFAULT_PRICING.tiers),
  };
}

export async function ensurePricingSettings() {
  const existing = await prisma.pricingSettings.findUnique({
    where: { id: "default" },
  });
  if (existing) return existing;

  const defaults = defaultRecord();
  return prisma.pricingSettings.create({
    data: {
      id: "default",
      ...defaults,
      tiers: defaults.tiers,
    },
  });
}

export async function getPricingSettings(): Promise<LoadedPricing> {
  try {
    const row = await ensurePricingSettings();
    const tiers = row.tiers as StoredPricingTier[];
    const params = toPricingParams({
      kwhPrice: row.kwhPrice,
      printerWatts: row.printerWatts,
      plaPricePerKg: row.plaPricePerKg,
      minRetailPrice: row.minRetailPrice,
      minWholesalePrice: row.minWholesalePrice,
      minBulkPrice: row.minBulkPrice,
      bulkQuantity: row.bulkQuantity,
      bulkMaxRetailPrice: row.bulkMaxRetailPrice,
      longPrintHours: row.longPrintHours,
      tiers,
    });
    return { ...params, longPrintHours: row.longPrintHours };
  } catch {
    return { ...DEFAULT_PRICING, longPrintHours: LONG_PRINT_HOURS };
  }
}
